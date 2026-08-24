import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const clientDirectory = join(root, "dist", "client");
const serverDirectory = join(root, "dist", "server");
const pagesWorkerDirectory = join(clientDirectory, "_worker.js");

async function assertExists(path, label) {
  try {
    await access(path);
  } catch {
    throw new Error(`Missing ${label}: ${path}`);
  }
}

async function copyRequiredFile(name) {
  await cp(join(serverDirectory, name), join(pagesWorkerDirectory, name), {
    force: true,
  });
}

async function writePagesWorkerEntry() {
  await writeFile(
    join(pagesWorkerDirectory, "index.js"),
    `import worker from "./server-entry.js";

function isStaticAsset(pathname) {
  return pathname.startsWith("/_next/static/");
}

function isCacheableHtmlPath(pathname) {
  return pathname === "/ranking" || pathname.startsWith("/ranking/") || pathname.startsWith("/keyword/");
}

function envString(env, name) {
  const value = env?.[name];
  return typeof value === "string" ? value.trim() : "";
}

function setRuntimeEnv(env) {
  globalThis.__ETFHELPER_ENV__ = env;
}

function withHtmlCache(request, response) {
  const pathname = new URL(request.url).pathname;
  const contentType = response.headers.get("content-type") || "";
  if (response.status !== 200 || !isCacheableHtmlPath(pathname) || !contentType.includes("text/html")) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=300, s-maxage=86400, stale-while-revalidate=86400");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function collectionUrl(env) {
  const configured = envString(env, "RANKING_COLLECT_URL");
  if (!configured) return "https://fastincome.kr/api/ranking/collect";
  try {
    const url = new URL(configured);
    return url.pathname === "/" ? new URL("/api/ranking/collect", url).toString() : url.toString();
  } catch {
    return "https://fastincome.kr/api/ranking/collect";
  }
}

export default {
  async fetch(request, env, ctx) {
    setRuntimeEnv(env);

    if (isStaticAsset(new URL(request.url).pathname)) {
      return env.ASSETS.fetch(request);
    }

    const response = await worker.fetch(request, env, ctx);
    return withHtmlCache(request, response);
  },

  async scheduled(controller, env, ctx) {
    setRuntimeEnv(env);
    const secret = envString(env, "RANKING_COLLECT_SECRET");
    if (!secret) {
      console.warn("Keyword ranking scheduled collection skipped: RANKING_COLLECT_SECRET is not configured.");
      return;
    }

    const task = worker.fetch(new Request(collectionUrl(env), {
      method: "POST",
      headers: {
        authorization: \`Bearer \${secret}\`,
        "x-scheduled-cron": controller?.cron || "",
      },
    }), env, ctx).then(async (response) => {
      if (!response.ok) {
        console.warn("Keyword ranking scheduled collection failed", {
          status: response.status,
          body: await response.text().catch(() => ""),
        });
      }
    });

    ctx.waitUntil(task);
    await task;
  },
};
`,
  );
}

async function copyRequiredDirectory(name) {
  await cp(join(serverDirectory, name), join(pagesWorkerDirectory, name), {
    force: true,
    recursive: true,
  });
}

async function ensureAssetsIgnore() {
  const assetsIgnorePath = join(clientDirectory, ".assetsignore");
  let current = "";

  try {
    current = await readFile(assetsIgnorePath, "utf8");
  } catch {
    current = "";
  }

  const entries = new Set(current.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  entries.add("wrangler.json");
  entries.add(".dev.vars");
  entries.add(".vite");
  entries.add("_worker.js");
  entries.add("_worker.js/**");

  await writeFile(assetsIgnorePath, `${[...entries].join("\n")}\n`);
}

await assertExists(clientDirectory, "Cloudflare client output");
await assertExists(join(serverDirectory, "index.js"), "Cloudflare Worker output");

await rm(pagesWorkerDirectory, { recursive: true, force: true });
await mkdir(pagesWorkerDirectory, { recursive: true });

await cp(join(serverDirectory, "index.js"), join(pagesWorkerDirectory, "server-entry.js"), {
  force: true,
});
await writePagesWorkerEntry();
await copyRequiredDirectory("_next");
await copyRequiredDirectory("ssr");
await copyRequiredFile("__vite_rsc_assets_manifest.js");
await copyRequiredFile("vinext-client-assets.js");
await copyRequiredFile("vinext-server.json");
await copyRequiredFile("BUILD_ID");
await ensureAssetsIgnore();
