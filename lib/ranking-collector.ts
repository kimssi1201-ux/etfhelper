import { keywordGrade, keywordScore } from "@/lib/keyword-shared";
import { NaverSearchAdError, lookupNaverKeywords } from "@/lib/naver-searchad";
import { rankingKeywords } from "@/lib/ranking-candidates";
import { getRankingEnvValue } from "@/lib/ranking-runtime";
import type { RankingRuntimeEnv } from "@/lib/ranking-runtime";
import {
  ensureRankingSchema,
  pruneOldRankingSnapshots,
  saveKeywordVolumeSnapshot,
} from "@/lib/ranking-store";

type RetryJob = {
  keyword: string;
  category: string;
  categorySlug: string;
  attempt: number;
};

type FailedKeyword = {
  keyword: string;
  category: string;
  reason: string;
};

export type RankingCollectionSummary = {
  collectedAt: string;
  collectedDate: string;
  candidates: number;
  saved: number;
  failed: number;
  failures: FailedKeyword[];
};

const defaultBatchSize = 10;
const defaultRequestDelayMs = 250;
const defaultBatchPauseMs = 500;
const maxAttempts = 3;

function envNumber(name: string, fallback: number) {
  const value = Number(getRankingEnvValue(name));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function kstDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}

function normalizeForMatch(value: string) {
  return value.replace(/\s+/g, "").toLocaleUpperCase("ko-KR");
}

function errorMessage(error: unknown) {
  if (error instanceof NaverSearchAdError) {
    return `${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

function retryDelay(error: unknown, requestDelayMs: number, attempt: number) {
  if (error instanceof NaverSearchAdError && error.code === "NAVER_SEARCHAD_RATE_LIMIT") {
    return Math.max(requestDelayMs * 6, 3000);
  }
  return Math.max(1000, attempt * 1000);
}

async function lookupExactMetric(keyword: string) {
  const result = await lookupNaverKeywords(keyword);
  const expected = normalizeForMatch(keyword);
  const metric = result.results.find((item) => normalizeForMatch(item.keyword) === expected);
  if (!metric) {
    throw new NaverSearchAdError(
      "NAVER_SEARCHAD_NO_DATA",
      "후보 키워드와 정확히 일치하는 검색량 데이터가 없습니다.",
      { upstreamMessage: `keyword=${keyword}` },
    );
  }
  return metric;
}

export async function collectDailyKeywordRankings(options: {
  now?: Date;
  env?: RankingRuntimeEnv;
} = {}): Promise<RankingCollectionSummary> {
  const schemaReady = await ensureRankingSchema(options.env);
  if (!schemaReady) throw new Error("KEYWORD_RANKING_DB binding is unavailable.");

  const now = options.now ?? new Date();
  const collectedAt = now.toISOString();
  const collectedDate = kstDateKey(now);
  const requestDelayMs = envNumber("RANKING_REQUEST_DELAY_MS", defaultRequestDelayMs);
  const batchSize = Math.max(1, envNumber("RANKING_BATCH_SIZE", defaultBatchSize));
  const batchPauseMs = envNumber("RANKING_BATCH_PAUSE_MS", defaultBatchPauseMs);
  const retryQueue: RetryJob[] = rankingKeywords.map((item) => ({ ...item, attempt: 1 }));
  const failures: FailedKeyword[] = [];
  let saved = 0;
  let processedSincePause = 0;

  // Naver SearchAd does not publish a fixed daily quota for SearchAd, but its FAQ
  // says calls are speed-limited by Customer ID/IP and may return 429. A SearchAd
  // maintainer has described ordinary API speed as roughly 20-30 rps, while the
  // RelKwdStat keyword tool is additionally limited to about 1/5-1/6 of other
  // operations. The defaults below stay near 4 rps and pause every 10 requests.
  while (retryQueue.length > 0) {
    const job = retryQueue.shift();
    if (!job) break;

    try {
      const metric = await lookupExactMetric(job.keyword);
      await saveKeywordVolumeSnapshot({
        keyword: job.keyword,
        category: job.category,
        categorySlug: job.categorySlug,
        pcVolume: metric.pc,
        mobileVolume: metric.mobile,
        totalVolume: metric.total,
        competitionGrade: keywordGrade(keywordScore(metric)),
        collectedAt,
        collectedDate,
      }, options.env);
      saved += 1;
    } catch (error) {
      const reason = errorMessage(error);
      console.warn("Keyword ranking collection failed", {
        attempt: job.attempt,
        category: job.category,
        keyword: job.keyword,
        reason,
      });

      if (job.attempt < maxAttempts) {
        retryQueue.push({ ...job, attempt: job.attempt + 1 });
        await sleep(retryDelay(error, requestDelayMs, job.attempt));
      } else {
        failures.push({ keyword: job.keyword, category: job.category, reason });
        console.warn("Keyword ranking collection skipped after 3 failures", {
          category: job.category,
          keyword: job.keyword,
          reason,
        });
      }
    }

    processedSincePause += 1;
    await sleep(requestDelayMs);

    if (processedSincePause >= batchSize) {
      processedSincePause = 0;
      await sleep(batchPauseMs);
    }
  }

  await pruneOldRankingSnapshots(now, options.env);

  return {
    collectedAt,
    collectedDate,
    candidates: rankingKeywords.length,
    saved,
    failed: failures.length,
    failures: failures.slice(0, 50),
  };
}
