import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  rm,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

test("deployment guard accepts Wrangler JSONC and rejects unconfigured production IDs", async () => {
  const root = new URL("../", import.meta.url);
  const dir = await mkdtemp(
    fileURLToPath(new URL(".build/deploy-check-", root)),
  );
  await mkdir(`${dir}/scripts`);
  await copyFile(
    new URL("scripts/check-config.mjs", root),
    `${dir}/scripts/check-config.mjs`,
  );
  const template = await readFile(new URL("wrangler.jsonc", root), "utf8");
  try {
    await writeFile(
      `${dir}/wrangler.jsonc`,
      template.replace(
        /"database_id"\s*:\s*"[^"]*"/,
        '"database_id": "REPLACE_WITH_D1_DATABASE_ID"',
      ),
    );
    assert.throws(
      () =>
        execFileSync(process.execPath, [`${dir}/scripts/check-config.mjs`], {
          stdio: "pipe",
        }),
      /Configure the production D1 database ID/,
    );
    const configured = ts.parseConfigFileTextToJson(
      "wrangler.jsonc",
      template,
    ).config;
    configured.d1_databases[0].database_id =
      "11111111-2222-3333-4444-555555555555";
    configured.vars.GITHUB_CLIENT_ID = "test-client-id";
    const jsonc =
      "// Wrangler permits comments and trailing commas.\n" +
      JSON.stringify(configured, null, 2).replace(/\n}$/, ",\n}");
    await writeFile(`${dir}/wrangler.jsonc`, jsonc);
    execFileSync(process.execPath, [`${dir}/scripts/check-config.mjs`], {
      stdio: "pipe",
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
