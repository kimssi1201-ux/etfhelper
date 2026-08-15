import { rm } from "node:fs/promises";

const generatedDevVars = new URL("../dist/server/.dev.vars", import.meta.url);

await rm(generatedDevVars, { force: true });
