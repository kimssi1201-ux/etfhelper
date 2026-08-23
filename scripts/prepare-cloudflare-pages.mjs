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

await cp(join(serverDirectory, "index.js"), join(pagesWorkerDirectory, "index.js"), {
  force: true,
});
await copyRequiredDirectory("_next");
await copyRequiredDirectory("ssr");
await copyRequiredFile("__vite_rsc_assets_manifest.js");
await copyRequiredFile("vinext-client-assets.js");
await copyRequiredFile("vinext-server.json");
await copyRequiredFile("BUILD_ID");
await ensureAssetsIgnore();
