import { rm } from "node:fs/promises";
import "./prepare-cloudflare-pages.mjs";

const generatedDevVars = new URL("../dist/server/.dev.vars", import.meta.url);

await rm(generatedDevVars, { force: true });
