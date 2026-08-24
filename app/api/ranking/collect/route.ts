import { collectDailyKeywordRankings } from "@/lib/ranking-collector";
import { getRankingEnvValue } from "@/lib/ranking-runtime";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store" };

function jsonError(message: string, status: number) {
  return Response.json({ error: { message } }, { status, headers: noStoreHeaders });
}

export async function POST(request: Request) {
  const secret = getRankingEnvValue("RANKING_COLLECT_SECRET");
  if (!secret) {
    console.warn("Keyword ranking collection secret is not configured.");
    return jsonError("Ranking collection is not configured.", 503);
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonError("Unauthorized.", 401);
  }

  try {
    const summary = await collectDailyKeywordRankings();
    return Response.json(summary, { headers: noStoreHeaders });
  } catch (error) {
    console.warn("Keyword ranking collection failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonError("Ranking collection failed.", 500);
  }
}
