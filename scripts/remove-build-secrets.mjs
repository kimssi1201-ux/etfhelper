import { rm } from "node:fs/promises";
import "./prepare-cloudflare-pages.mjs";

const generatedDevVars = new URL("../dist/server/.dev.vars", import.meta.url);
const generatedDeployRedirect = new URL("../.wrangler/deploy/config.json", import.meta.url);

await rm(generatedDevVars, { force: true });
await rm(generatedDeployRedirect, { force: true });
