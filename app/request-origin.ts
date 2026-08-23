import { headers } from "next/headers";

export async function getRequestOrigin() {
  const incoming = await headers();
  const forwardedHost = incoming.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || incoming.get("host") || "localhost:3000";
  const forwardedProtocol = incoming.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost")
      ? "http"
      : "https";

  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return new URL("http://localhost:3000");
  }
}
