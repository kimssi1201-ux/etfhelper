import type { NaverOpenApiInsights } from "@/lib/naver-openapi";

export type KeywordMetric = {
  keyword: string;
  pc: number;
  mobile: number;
  total: number;
  mobileRate: number;
  competition: string;
  bid: number | null;
};

export type KeywordApiResponse = {
  keyword: string;
  results: KeywordMetric[];
  updatedAt: string;
  source: "NAVER_SEARCHAD";
  openApi?: NaverOpenApiInsights;
};

export type KeywordTrendPoint = {
  collectedAt: string;
  collectedDate: string;
  pcVolume: number;
  mobileVolume: number;
  totalVolume: number;
};

export type KeywordTabId = "summary" | "briefing" | "cards" | "ranking" | "related";

export const defaultKeyword = "부업";
export const popularKeywords = ["부업", "배당주", "스마트스토어", "블로그 수익", "키워드 검색량"];
export const keywordFetchFailedMessage = "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요";
export const keywordLoadingMessage = "키워드 데이터를 조회 중입니다.";
export const keywordNoDataMessage = "데이터를 찾을 수 없습니다";

export const keywordTabs: Array<{ id: KeywordTabId; label: string }> = [
  { id: "summary", label: "요약" },
  { id: "briefing", label: "AI 브리핑" },
  { id: "cards", label: "키워드 카드" },
  { id: "ranking", label: "상승 키워드" },
  { id: "related", label: "상세 표" },
];

export const gradeCriteria = [
  { grade: "S", label: "82점 이상", description: "검색량 대비 경쟁 부담이 매우 낮음" },
  { grade: "A", label: "68점 이상", description: "진입 여지가 충분함" },
  { grade: "B", label: "52점 이상", description: "경쟁 보통" },
  { grade: "C", label: "36점 이상", description: "경쟁이 다소 치열함" },
  { grade: "D", label: "36점 미만", description: "경쟁 강함" },
];

export function normalizeKeyword(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function decodeKeywordParam(value: string | null | undefined) {
  const normalized = normalizeKeyword(value);
  if (!normalized) return "";

  try {
    return normalizeKeyword(decodeURIComponent(normalized));
  } catch {
    return normalized;
  }
}

export function keywordPath(keyword: string) {
  const normalized = normalizeKeyword(keyword) || defaultKeyword;
  return `/keyword/${encodeURIComponent(normalized)}`;
}

export function keywordSearchPath(keyword: string, tab?: KeywordTabId) {
  const params = new URLSearchParams({ q: normalizeKeyword(keyword) || defaultKeyword });
  if (tab && tab !== "summary") params.set("tab", tab);
  return `/dl?${params.toString()}`;
}

export function isKeywordTab(value: string | null): value is KeywordTabId {
  return keywordTabs.some((tab) => tab.id === value);
}

export function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

export function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "집계 준비 중";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${hours}:${minutes} 기준`;
}

export function competitionScore(value: string) {
  if (value === "낮음") return 24;
  if (value === "중간") return 52;
  if (value === "높음") return 82;
  return 45;
}

export function keywordScore(item: KeywordMetric) {
  const volume = Math.min(42, Math.round(Math.log10(Math.max(item.total, 10)) * 10));
  const mobile = Math.min(18, Math.round(item.mobileRate / 6));
  const competition = 40 - Math.round(competitionScore(item.competition) / 3);
  return Math.max(1, Math.min(100, volume + mobile + competition));
}

export function keywordGrade(score: number) {
  if (score >= 82) return "S";
  if (score >= 68) return "A";
  if (score >= 52) return "B";
  if (score >= 36) return "C";
  return "D";
}

export function gradeStep(grade: string) {
  return ({ S: 1, A: 2, B: 3, C: 4, D: 5 } as Record<string, number>)[grade] ?? 5;
}

export function gradeTone(grade: string) {
  if (grade === "S" || grade === "A") return "easy";
  if (grade === "B" || grade === "C") return "mid";
  return "hard";
}

export function gradeMessage(grade: string) {
  if (grade === "S") return "매우 수월함";
  if (grade === "A") return "진입 여지 있음";
  if (grade === "B") return "경쟁 보통";
  if (grade === "C") return "경쟁이 다소 치열함";
  return "경쟁 강함";
}

export function gradeBadgeLabel(grade: string) {
  return `${grade}등급 · ${gradeMessage(grade)}`;
}

export function competitionTone(value: string) {
  if (value === "낮음") return "easy";
  if (value === "중간") return "mid";
  return "hard";
}

export function hasNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function volumeBarWidth(volume: number, maxVolume: number) {
  if (volume <= 0 || maxVolume <= 0) return 0;
  const ratio = Math.log10(volume + 1) / Math.log10(maxVolume + 1);
  return Math.max(4, Math.round(ratio * 100));
}

export function keywordMetadataTitle(keyword: string, primary: KeywordMetric) {
  const grade = keywordGrade(keywordScore(primary));
  return `${keyword} 검색량 ${formatNumber(primary.total)}회 | 경쟁도 ${grade} | 키워드랩`;
}

export function keywordMetadataDescription(keyword: string, primary: KeywordMetric) {
  const grade = keywordGrade(keywordScore(primary));
  return `${keyword} 키워드는 월간 검색량 ${formatNumber(primary.total)}회, PC ${formatNumber(primary.pc)}회와 모바일 ${formatNumber(primary.mobile)}회로 집계되며 모바일 비중은 ${primary.mobileRate}%, 경쟁도는 ${primary.competition}(${grade}등급)입니다.`;
}
