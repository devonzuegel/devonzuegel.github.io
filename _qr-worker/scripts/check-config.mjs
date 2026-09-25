import { readFile } from "node:fs/promises";
import ts from "typescript";
const parsed = ts.parseConfigFileTextToJson(
  "wrangler.jsonc",
  await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
);
if (parsed.error) throw new Error("Invalid wrangler.jsonc configuration.");
const config = parsed.config;
if (
  config.d1_databases[0].database_id.includes("REPLACE") ||
  config.vars.GITHUB_CLIENT_ID.includes("REPLACE")
)
  throw new Error(
    "Configure the production D1 database ID and GitHub OAuth client ID before deploying. See README.md.",
  );
if (config.workers_dev !== false || config.preview_urls !== false)
  throw new Error("Keep temporary public URLs disabled.");
