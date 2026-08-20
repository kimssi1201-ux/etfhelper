export async function POST(request: Request) {
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected) return Response.json({ error: "ADMIN_ACCESS_KEY가 설정되지 않았습니다." }, { status: 503, headers: { "cache-control": "no-store" } });
  const body = await request.json().catch(() => ({})) as { key?: string };
  if (body.key !== expected) return Response.json({ error: "인증 실패" }, { status: 401, headers: { "cache-control": "no-store" } });
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
