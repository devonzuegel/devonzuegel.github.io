import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFile, readdir } from "node:fs/promises";
import worker from "../.build/index.mjs";
import { random, hash, now } from "../.build/core.mjs";
export async function fixture() {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("ok")}}',
      compatibilityDate: "2026-09-24",
      d1Databases: { DB: "qr-test" },
    }),
  );
  const DB = await mf.getD1Database("DB");
  const migrations = new URL("../migrations/", import.meta.url);
  for (const file of (await readdir(migrations))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(new URL(file, migrations), "utf8");
    // Execute complete SQL statements, keeping each trigger's BEGIN…END intact.
    const statements = sql
      .replace(/^--.*$/gm, "")
      .split(/;(?=\s*(?:CREATE|ALTER|PRAGMA|$))/)
      .map((x) => x.trim())
      .filter(Boolean);
    for (const s of statements) await DB.prepare(s).run();
  }
  const allow = { limit: async () => ({ success: true }) };
  const env = {
    DB,
    SOURCE_LIMIT: allow,
    GLOBAL_LIMIT: allow,
    AUTH_LIMIT: allow,
    DASHBOARD_ORIGIN: "https://devonzuegel.com",
    PUBLIC_ORIGIN: "https://qr.devonzuegel.com",
    OWNER_GITHUB_ID: "6979755",
    GITHUB_CLIENT_ID: "test-client",
    GITHUB_CLIENT_SECRET: "test-secret",
    RATE_HASH_SECRET: "test-rate-hash-secret-at-least-32-characters",
    EMAIL_ENABLED: "true",
    RESEND_API_KEY: "test-key",
    EMAIL_FROM: "QR Alerts <alerts@example.net>",
    ALERT_RECIPIENT: "owner@example.net",
  };
  const pending = [];
  const ctx = {
    waitUntil(p) {
      pending.push(p);
    },
    passThroughOnException() {},
  };
  const token = random(),
    csrf = random();
  await DB.prepare("INSERT INTO sessions VALUES(?,?,?,?)")
    .bind(await hash(token), env.OWNER_GITHUB_ID, csrf, now() + 3600)
    .run();
  const cookie = `__Host-qr_session=${token}`;
  async function request(path, options = {}) {
    const { owner = true, cf, ...rest } = options;
    const req = new Request(env.PUBLIC_ORIGIN + path, {
      ...rest,
      headers: {
        ...(owner
          ? { cookie, Origin: env.DASHBOARD_ORIGIN, "X-CSRF-Token": csrf }
          : {}),
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...rest.headers,
      },
    });
    if (cf) Object.defineProperty(req, "cf", { value: cf });
    return worker.fetch(req, env, ctx);
  }
  async function code(fields = {}) {
    const r = await request("/api/codes", {
      method: "POST",
      headers: { "Idempotency-Key": random() },
      body: JSON.stringify({
        name: "Library flyer",
        destination: "example.com/page",
        placement: "Bulletin board",
        alerts: true,
        ...fields,
      }),
    });
    if (r.status !== 201) throw new Error(await r.text());
    return r.json();
  }
  return {
    mf,
    env,
    DB,
    ctx,
    cookie,
    csrf,
    token,
    request,
    code,
    drain: () => Promise.all(pending.splice(0)),
    close: async () => {
      await Promise.all(pending);
      await mf.dispose();
    },
  };
}
