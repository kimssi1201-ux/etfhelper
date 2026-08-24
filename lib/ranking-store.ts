import type { KeywordTrendPoint } from "@/lib/keyword-shared";
import { getRankingDb } from "@/lib/ranking-runtime";
import type { D1Database, RankingRuntimeEnv } from "@/lib/ranking-runtime";

export type KeywordVolumeSnapshot = {
  keyword: string;
  category: string;
  categorySlug: string;
  pcVolume: number;
  mobileVolume: number;
  totalVolume: number;
  competitionGrade: string;
  collectedAt: string;
  collectedDate: string;
};

export type RankingRow = KeywordVolumeSnapshot & {
  rank: number;
  dailyChangePct: number | null;
  weeklyChangePct: number | null;
  rankChange: number | null;
};

export type RankingResult = {
  collectedAt: string | null;
  collectedDate: string | null;
  rows: RankingRow[];
};

type StoredRankingRow = {
  keyword: string;
  category: string;
  category_slug: string;
  pc_volume: number;
  mobile_volume: number;
  total_volume: number;
  competition_grade: string;
  collected_at: string;
  collected_date: string;
};

type RankingDateRow = {
  collected_date: string;
  collected_at: string;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS keyword_volume_history (
    keyword TEXT NOT NULL,
    category TEXT NOT NULL,
    category_slug TEXT NOT NULL,
    pc_volume INTEGER NOT NULL,
    mobile_volume INTEGER NOT NULL,
    total_volume INTEGER NOT NULL,
    competition_grade TEXT NOT NULL,
    collected_at TEXT NOT NULL,
    collected_date TEXT NOT NULL,
    PRIMARY KEY (keyword, collected_date)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_keyword_volume_history_latest ON keyword_volume_history (collected_date, total_volume DESC)",
  "CREATE INDEX IF NOT EXISTS idx_keyword_volume_history_category ON keyword_volume_history (category_slug, collected_date, total_volume DESC)",
  "CREATE INDEX IF NOT EXISTS idx_keyword_volume_history_keyword ON keyword_volume_history (keyword, collected_date DESC)",
];

function toSnapshot(row: StoredRankingRow): KeywordVolumeSnapshot {
  return {
    keyword: row.keyword,
    category: row.category,
    categorySlug: row.category_slug,
    pcVolume: row.pc_volume,
    mobileVolume: row.mobile_volume,
    totalVolume: row.total_volume,
    competitionGrade: row.competition_grade,
    collectedAt: row.collected_at,
    collectedDate: row.collected_date,
  };
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number) {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return dateKey(shifted);
}

function roundPct(value: number) {
  return Math.round(value * 10) / 10;
}

function changePct(current: number, previous: number | null | undefined) {
  // Change rate formula: ((current total_volume - previous total_volume) / previous total_volume) * 100.
  // Return null when previous day/week data is absent or zero so the UI never invents a 0% movement.
  if (!previous || previous <= 0) return null;
  return roundPct(((current - previous) / previous) * 100);
}

function rankRows(rows: KeywordVolumeSnapshot[]) {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

function rowByKeyword(rows: KeywordVolumeSnapshot[]) {
  return new Map(rows.map((row) => [row.keyword, row]));
}

function rankByKeyword(rows: Array<KeywordVolumeSnapshot & { rank: number }>) {
  return new Map(rows.map((row) => [row.keyword, row.rank]));
}

async function allRows(db: D1Database, sql: string, values: unknown[] = []) {
  const result = await db.prepare(sql).bind(...values).all<StoredRankingRow>();
  return (result.results ?? []).map(toSnapshot);
}

async function getLatestDate(db: D1Database) {
  return db.prepare(
    `SELECT collected_date, MAX(collected_at) AS collected_at
     FROM keyword_volume_history
     GROUP BY collected_date
     ORDER BY collected_date DESC
     LIMIT 1`,
  ).first<RankingDateRow>();
}

async function getExactDate(db: D1Database, date: string) {
  return db.prepare(
    `SELECT collected_date, MAX(collected_at) AS collected_at
     FROM keyword_volume_history
     WHERE collected_date = ?
     GROUP BY collected_date
     LIMIT 1`,
  ).bind(date).first<RankingDateRow>();
}

async function getRowsForDate(db: D1Database, collectedDate: string, categorySlug?: string | null) {
  const categoryClause = categorySlug ? "AND category_slug = ?" : "";
  const values = categorySlug ? [collectedDate, categorySlug] : [collectedDate];
  return allRows(
    db,
    `SELECT keyword, category, category_slug, pc_volume, mobile_volume, total_volume,
      competition_grade, collected_at, collected_date
     FROM keyword_volume_history
     WHERE collected_date = ? ${categoryClause}
     ORDER BY total_volume DESC, keyword ASC`,
    values,
  );
}

function withComparisons(
  latestRows: KeywordVolumeSnapshot[],
  previousRows: KeywordVolumeSnapshot[],
  weeklyRows: KeywordVolumeSnapshot[],
) {
  const rankedLatest = rankRows(latestRows);
  const previousByKeyword = rowByKeyword(previousRows);
  const weeklyByKeyword = rowByKeyword(weeklyRows);
  const previousRanks = rankByKeyword(rankRows(previousRows));

  return rankedLatest.map((row): RankingRow => {
    const previousRank = previousRanks.get(row.keyword) ?? null;
    return {
      ...row,
      dailyChangePct: changePct(row.totalVolume, previousByKeyword.get(row.keyword)?.totalVolume),
      weeklyChangePct: changePct(row.totalVolume, weeklyByKeyword.get(row.keyword)?.totalVolume),
      rankChange: previousRank === null ? null : previousRank - row.rank,
    };
  });
}

export async function ensureRankingSchema(env?: RankingRuntimeEnv) {
  const db = getRankingDb(env);
  if (!db) return false;

  for (const statement of schemaStatements) {
    await db.prepare(statement).run();
  }

  return true;
}

export async function saveKeywordVolumeSnapshot(snapshot: KeywordVolumeSnapshot, env?: RankingRuntimeEnv) {
  const db = getRankingDb(env);
  if (!db) throw new Error("KEYWORD_RANKING_DB binding is unavailable.");

  await db.prepare(
    `INSERT INTO keyword_volume_history (
      keyword, category, category_slug, pc_volume, mobile_volume, total_volume,
      competition_grade, collected_at, collected_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(keyword, collected_date) DO UPDATE SET
      category = excluded.category,
      category_slug = excluded.category_slug,
      pc_volume = excluded.pc_volume,
      mobile_volume = excluded.mobile_volume,
      total_volume = excluded.total_volume,
      competition_grade = excluded.competition_grade,
      collected_at = excluded.collected_at`,
  ).bind(
    snapshot.keyword,
    snapshot.category,
    snapshot.categorySlug,
    snapshot.pcVolume,
    snapshot.mobileVolume,
    snapshot.totalVolume,
    snapshot.competitionGrade,
    snapshot.collectedAt,
    snapshot.collectedDate,
  ).run();
}

export async function pruneOldRankingSnapshots(collectedAt: Date, env?: RankingRuntimeEnv) {
  const db = getRankingDb(env);
  if (!db) return false;

  const cutoff = new Date(collectedAt);
  cutoff.setUTCDate(cutoff.getUTCDate() - 90);
  await db.prepare("DELETE FROM keyword_volume_history WHERE collected_at < ?")
    .bind(cutoff.toISOString())
    .run();
  return true;
}

export async function getRankingResult(options: {
  categorySlug?: string | null;
  limit?: number;
  rising?: boolean;
  env?: RankingRuntimeEnv;
} = {}): Promise<RankingResult> {
  const db = getRankingDb(options.env);
  if (!db) return { collectedAt: null, collectedDate: null, rows: [] };

  try {
    const latest = await getLatestDate(db);
    if (!latest) return { collectedAt: null, collectedDate: null, rows: [] };

    const previous = await getExactDate(db, shiftDate(latest.collected_date, -1));
    const week = await getExactDate(db, shiftDate(latest.collected_date, -7));
    const latestRows = await getRowsForDate(db, latest.collected_date, options.categorySlug);
    const previousRows = previous ? await getRowsForDate(db, previous.collected_date, options.categorySlug) : [];
    const weeklyRows = week ? await getRowsForDate(db, week.collected_date, options.categorySlug) : [];
    const comparedRows = withComparisons(latestRows, previousRows, weeklyRows);
    const rows = options.rising
      ? comparedRows
        .filter((row) => row.totalVolume >= 500 && row.dailyChangePct !== null)
        .sort((a, b) => (b.dailyChangePct ?? -Infinity) - (a.dailyChangePct ?? -Infinity))
      : comparedRows;

    return {
      collectedAt: latest.collected_at,
      collectedDate: latest.collected_date,
      rows: rows.slice(0, options.limit ?? 100),
    };
  } catch (error) {
    console.warn("Keyword ranking read failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { collectedAt: null, collectedDate: null, rows: [] };
  }
}

export async function getKeywordTrend(keyword: string, days = 30, env?: RankingRuntimeEnv): Promise<KeywordTrendPoint[]> {
  const db = getRankingDb(env);
  if (!db) return [];

  try {
    const result = await db.prepare(
      `SELECT keyword, category, category_slug, pc_volume, mobile_volume, total_volume,
        competition_grade, collected_at, collected_date
       FROM keyword_volume_history
       WHERE keyword = ?
       ORDER BY collected_date DESC
       LIMIT ?`,
    ).bind(keyword, days).all<StoredRankingRow>();

    return (result.results ?? [])
      .map(toSnapshot)
      .reverse()
      .map((row) => ({
        collectedAt: row.collectedAt,
        collectedDate: row.collectedDate,
        pcVolume: row.pcVolume,
        mobileVolume: row.mobileVolume,
        totalVolume: row.totalVolume,
      }));
  } catch (error) {
    console.warn("Keyword trend read failed", {
      keyword,
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function getSitemapKeywordEntries(limit = 300, env?: RankingRuntimeEnv) {
  const db = getRankingDb(env);
  if (!db) return [];

  try {
    const latest = await getLatestDate(db);
    if (!latest) return [];
    const rows = await getRowsForDate(db, latest.collected_date);
    return rows
      .filter((row) => row.totalVolume > 0)
      .slice(0, limit)
      .map((row) => ({
        keyword: row.keyword,
        lastModified: new Date(row.collectedAt),
      }));
  } catch (error) {
    console.warn("Ranking sitemap keyword read failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export function formatRankingBasisTime(value: string | null) {
  if (!value) return "데이터 수집 전";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "데이터 수집 전";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}년 ${byType.get("month")}월 ${byType.get("day")}일 ${byType.get("hour")}:${byType.get("minute")} 기준`;
}
