export type D1Result<T> = {
  results?: T[];
  success?: boolean;
  error?: string;
  meta?: unknown;
};

export type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(columnName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<never>>;
};

export type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

export type RankingRuntimeEnv = Record<string, unknown> & {
  KEYWORD_RANKING_DB?: D1Database;
  RANKING_COLLECT_SECRET?: string;
};

declare global {
  // Cloudflare Pages passes bindings to the worker entry. The generated worker
  // stores them here so server-rendered modules can access D1 without shipping
  // any binding or secret to the client bundle.
  var __ETFHELPER_ENV__: RankingRuntimeEnv | undefined;
}

export function setRankingRuntimeEnv(env: RankingRuntimeEnv | undefined) {
  if (env) globalThis.__ETFHELPER_ENV__ = env;
}

export function getRankingRuntimeEnv() {
  return globalThis.__ETFHELPER_ENV__ ?? {};
}

export function getRankingDb(env?: RankingRuntimeEnv) {
  return env?.KEYWORD_RANKING_DB ?? getRankingRuntimeEnv().KEYWORD_RANKING_DB ?? null;
}

export function getRankingEnvValue(name: string) {
  const runtimeValue = getRankingRuntimeEnv()[name];
  if (typeof runtimeValue === "string" && runtimeValue.trim()) return runtimeValue.trim();
  const processValue = process.env[name];
  return typeof processValue === "string" && processValue.trim() ? processValue.trim() : "";
}
