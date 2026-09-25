import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";
import {
  now,
  random,
  hash,
  destination,
  sourceKey,
  emailPayload,
} from "../.build/core.mjs";
import {
  recordVisit,
  dispatch,
  maintenance,
  queueTest,
} from "../.build/outbox.mjs";
let f, originalFetch;
beforeEach(async () => {
  f = await fixture();
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "provider-id" }), { status: 200 });
});
afterEach(async () => {
  await f.close();
  globalThis.fetch = originalFetch;
});
const count = async (table) =>
  Number((await f.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n);
const req = () =>
  new Request("https://qr.devonzuegel.com/r/id", {
    headers: { "User-Agent": "Mozilla/5.0", "cf-connecting-ip": "203.0.113.1" },
  });
test("all admin routes require owner session; CORS does not authorize mutations", async () => {
  const c = await f.code();
  for (const [path, method] of [
    ["/api/session", "GET"],
    ["/api/settings", "GET"],
    ["/api/codes", "GET"],
    ["/api/codes", "POST"],
    [`/api/codes/${c.id}`, "PATCH"],
    [`/api/codes/${c.id}/visits`, "GET"],
    ["/api/test-email", "POST"],
  ])
    assert.equal((await f.request(path, { owner: false, method })).status, 401);
  await f.DB.prepare("UPDATE sessions SET owner_id=?").bind("123").run();
  assert.equal((await f.request("/api/codes")).status, 401);
  await f.DB.prepare("UPDATE sessions SET owner_id=?,expires_at=?")
    .bind(f.env.OWNER_GITHUB_ID, now() - 1)
    .run();
  assert.equal((await f.request("/api/settings")).status, 401);
  await f.DB.prepare("UPDATE sessions SET expires_at=?")
    .bind(now() + 1000)
    .run();
  for (const headers of [
    { Origin: "https://evil.example" },
    { "X-CSRF-Token": "wrong" },
  ])
    assert.equal(
      (
        await f.request("/api/test-email", {
          method: "POST",
          body: "{}",
          headers,
        })
      ).status,
      403,
    );
  const r = await f.request("/api/codes", {
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(
    (await f.request("/api/codes")).headers.get("Access-Control-Allow-Origin"),
    f.env.DASHBOARD_ORIGIN,
  );
});
test("URL normalization rejects credentials, schemes and tracking loops", () => {
  assert.equal(
    destination("example.com/hello", f.env),
    "https://example.com/hello",
  );
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,a",
    "ftp://example.com",
    "https://me:password@example.com",
    "https://qr.devonzuegel.com/r/x",
    "https://qr.devonzuegel.com.:443/r/x",
    "hello world",
    "https://example.com\\@evil.com",
  ])
    assert.throws(() => destination(url, f.env));
});
test("creation retries are idempotent; edits keep ID, copies get new ID, disable is reversible", async () => {
  const headers = { "Idempotency-Key": random() },
    data = {
      name: "Code",
      destination: "example.com",
      placement: "",
      alerts: true,
    };
  const rs = await Promise.all(
    Array.from({ length: 3 }, () =>
      f
        .request("/api/codes", {
          method: "POST",
          headers,
          body: JSON.stringify(data),
        })
        .then((r) => r.json()),
    ),
  );
  assert.equal(new Set(rs.map((c) => c.id)).size, 1);
  assert.equal(await count("codes"), 1);
  const c = rs[0];
  assert.equal(c.id.length, 22);
  const copy = await f.code(data);
  assert.notEqual(copy.id, c.id);
  await f.request(`/api/codes/${c.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...data,
      destination: "https://example.org/new",
      active: false,
    }),
  });
  assert.equal((await f.request(`/r/${c.id}`, { owner: false })).status, 410);
  await f.request(`/api/codes/${c.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...data,
      destination: "https://example.org/new",
      active: true,
    }),
  });
  const r = await f.request(`/r/${c.id}`, { owner: false });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("Location"), "https://example.org/new");
  assert.equal(r.headers.get("Cache-Control"), "no-store");
});
test("eligible open records coarse location and one escaped, immutable email snapshot", async () => {
  let sent;
  globalThis.fetch = async (url, opts) => {
    sent = opts;
    return new Response('{"id":"accepted"}');
  };
  const c = await f.code({ name: "Library <flyer>", placement: "A & B" });
  const r = await f.request(`/r/${c.id}`, {
    owner: false,
    cf: {
      city: "Asheville",
      region: "North Carolina",
      country: "US",
      latitude: "private",
    },
    headers: {
      "User-Agent": "Mobile Safari",
      "cf-connecting-ip": "203.0.113.50",
    },
  });
  assert.equal(r.status, 302);
  await f.drain();
  const visit = await f.DB.prepare("SELECT * FROM visits").first();
  assert.equal(visit.city, "Asheville");
  assert.equal(visit.email_status, "accepted");
  assert.equal("latitude" in visit, false);
  assert.equal("ip" in visit, false);
  const payload = JSON.parse(sent.body);
  assert.match(payload.text, /America\/New_York/);
  assert.match(payload.text, /Asheville/);
  assert.match(payload.html, /&lt;flyer&gt;/);
  assert.match(payload.html, /A &amp; B/);
  assert.equal(payload.to[0], "owner@example.net");
  assert.match(sent.headers["Idempotency-Key"], /^qr\//);
  await f.request(`/api/codes/${c.id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...c, name: "Changed" }),
  });
  assert.equal(
    JSON.parse(
      (await f.DB.prepare("SELECT payload FROM email_jobs").first()).payload,
    ).subject,
    payload.subject,
  );
});
test("HEAD, OPTIONS, prefetch and recognizable previews neither count nor send", async () => {
  const c = await f.code();
  for (const options of [
    { method: "HEAD" },
    { method: "OPTIONS" },
    { headers: { Purpose: "prefetch" } },
    { headers: { "Sec-Purpose": "prefetch;prerender" } },
    { headers: { "User-Agent": "Slackbot-LinkExpanding" } },
    { headers: { "User-Agent": "facebookexternalhit/1.1" } },
  ])
    await f.request(`/r/${c.id}`, { owner: false, ...options });
  await f.request(`/api/codes/${c.id}`);
  await f.request("/api/codes");
  assert.equal(await count("visits"), 0);
  assert.equal(await count("email_jobs"), 0);
});
test("logging limits and alert cooldowns preserve redirects and honest open counts", async () => {
  const c = await f.code(),
    t = now();
  await recordVisit(req(), f.env, c, "shared-source", t);
  await recordVisit(req(), f.env, c, "shared-source", t + 20);
  assert.equal(await count("visits"), 2);
  assert.equal(await count("email_jobs"), 1);
  assert.equal(
    (
      await f.DB.prepare(
        "SELECT reason FROM visits ORDER BY opened_at DESC",
      ).first()
    ).reason,
    "source_cooldown",
  );
  f.env.LOG_DAILY_LIMIT = "2";
  assert.equal((await f.request(`/r/${c.id}`, { owner: false })).status, 302);
  assert.equal(await count("visits"), 2);
  f.env.SOURCE_LIMIT = { limit: async () => ({ success: false }) };
  assert.equal((await f.request(`/r/${c.id}`, { owner: false })).status, 302);
  assert.equal(await count("visits"), 2);
  assert.equal(
    (
      await f.DB.prepare("SELECT opens FROM codes WHERE id=?")
        .bind(c.id)
        .first()
    ).opens,
    2,
  );
});
test("database write failure after resolution redirects; resolution failure returns 503", async () => {
  const c = await f.code();
  const db = f.env.DB;
  f.env.DB = {
    prepare: db.prepare.bind(db),
    batch: async () => {
      throw new Error("secret must not appear");
    },
  };
  assert.equal((await f.request(`/r/${c.id}`, { owner: false })).status, 302);
  f.env.DB = {
    prepare() {
      throw new Error("secret must not appear");
    },
  };
  const r = await f.request(`/r/${c.id}`, { owner: false });
  assert.equal(r.status, 503);
  assert.doesNotMatch(await r.text(), /secret must/);
});
test("concurrent admission respects daily and monthly reservations, including tests", async () => {
  f.env.EMAIL_DAILY_BUDGET = "2";
  const codes = await Promise.all(Array.from({ length: 8 }, () => f.code()));
  await Promise.all(
    codes.map((c, i) => recordVisit(req(), f.env, c, `source-${i}`)),
  );
  assert.equal(await count("visits"), 8);
  assert.equal(await count("email_jobs"), 2);
  assert.equal(await count("email_reservations"), 2);
  assert.equal(await queueTest(f.env), null);
  assert.equal(
    (
      await f.DB.prepare(
        "SELECT COUNT(*) n FROM visits WHERE reason='email_budget'",
      ).first()
    ).n,
    6,
  );
  f.env.EMAIL_DAILY_BUDGET = "80";
  f.env.EMAIL_MONTHLY_BUDGET = "2";
  const c = await f.code();
  const v = await recordVisit(req(), f.env, c, "source-new");
  assert.equal(v.reason, "email_budget");
});
test("atomic claims and stable idempotency protect concurrent dispatch and uncertain retries", async () => {
  const c = await f.code();
  await recordVisit(req(), f.env, c, "one");
  const requests = [];
  let fail = true;
  globalThis.fetch = async (url, opts) => {
    requests.push(opts);
    if (fail) throw new Error("uncertain network");
    return new Response('{"id":"accepted"}');
  };
  await Promise.all([dispatch(f.env), dispatch(f.env), dispatch(f.env)]);
  assert.equal(requests.length, 1);
  let job = await f.DB.prepare("SELECT * FROM email_jobs").first();
  assert.equal(job.status, "pending");
  fail = false;
  await Promise.all([
    dispatch(f.env, undefined, now() + 61),
    dispatch(f.env, undefined, now() + 61),
  ]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(
    requests[0].headers["Idempotency-Key"],
    requests[1].headers["Idempotency-Key"],
  );
  assert.equal(
    (await f.DB.prepare("SELECT status FROM email_jobs").first()).status,
    "accepted",
  );
});
test("provider quota is suppressed and persistent; temporary failures retry, config failures fail", async () => {
  const c = await f.code();
  await recordVisit(req(), f.env, c, "one");
  globalThis.fetch = async () =>
    new Response('{"name":"daily_quota_exceeded"}', { status: 429 });
  await dispatch(f.env);
  assert.equal(
    (await f.DB.prepare("SELECT status FROM email_jobs").first()).status,
    "suppressed",
  );
  const settings = await (await f.request("/api/settings")).json();
  assert.equal(settings.pause.value, "daily_quota_exceeded");
  const c2 = await f.code();
  assert.equal(
    (await recordVisit(req(), f.env, c2, "two")).reason,
    "provider_paused",
  );
  await f.DB.prepare("DELETE FROM operations").run();
  await recordVisit(req(), f.env, c2, "three", now() + 20);
  globalThis.fetch = async () =>
    new Response('{"name":"validation_error"}', { status: 403 });
  await dispatch(f.env, undefined, now() + 21);
  assert.equal(
    (
      await f.DB.prepare(
        "SELECT COUNT(*) n FROM email_jobs WHERE status='failed'",
      ).first()
    ).n,
    1,
  );
});
test("test emails are deliberate, recipient-fixed, atomic, and rate-limited", async () => {
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      f.request("/api/test-email", {
        method: "POST",
        body: '{"to":"attacker@example.net"}',
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === 202).length, 1);
  assert.equal(await count("email_jobs"), 1);
  const job = await f.DB.prepare("SELECT payload FROM email_jobs").first();
  assert.deepEqual(JSON.parse(job.payload).to, ["owner@example.net"]);
});
test("stale leases recover, deadline prevents sends after idempotency window; 90-day cleanup retains aggregates", async () => {
  const c = await f.code(),
    t = now();
  await recordVisit(req(), f.env, c, "old", t - 91 * 86400);
  await maintenance(f.env, t);
  assert.equal(await count("visits"), 0);
  assert.equal(await count("email_jobs"), 0);
  assert.equal(
    (await f.DB.prepare("SELECT opens FROM codes").first()).opens,
    1,
  );
  await recordVisit(req(), f.env, c, "new", t);
  await f.DB.prepare(
    "UPDATE email_jobs SET status='sending',lease_until=?,claim_token='lost'",
  )
    .bind(t - 1)
    .run();
  await maintenance(f.env, t);
  assert.equal(
    (await f.DB.prepare("SELECT status FROM email_jobs").first()).status,
    "pending",
  );
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('{"id":"accepted"}');
  };
  await dispatch(f.env, undefined, t + 7 * 3600);
  assert.equal(calls, 0);
  assert.equal(
    (await f.DB.prepare("SELECT status FROM email_jobs").first()).status,
    "failed",
  );
});
test("OAuth PKCE, browser-bound one-use state, numeric owner check and logout", async () => {
  const start = await f.request("/auth/login", { owner: false });
  const u = new URL(start.headers.get("Location"));
  assert.equal(u.searchParams.get("code_challenge_method"), "S256");
  assert.equal(u.searchParams.get("scope"), "");
  const cookie = start.headers.get("Set-Cookie").split(";")[0];
  assert.match(cookie, /^__Host-qr_oauth=/);
  assert.match(start.headers.get("Set-Cookie"), /Secure/);
  assert.match(start.headers.get("Set-Cookie"), /HttpOnly/);
  assert.equal(
    (
      await f.request(
        `/auth/callback?state=${u.searchParams.get("state")}&code=test`,
        { owner: false },
      )
    ).status,
    400,
  );
  let verifier;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("access_token")) {
      verifier = options.body.get("code_verifier");
      return new Response('{"access_token":"server-only"}');
    }
    return new Response('{"id":6979755}');
  };
  const r = await f.request(
    `/auth/callback?state=${u.searchParams.get("state")}&code=test`,
    { owner: false, headers: { cookie } },
  );
  assert.equal(r.status, 302);
  assert.equal(await hash(verifier), u.searchParams.get("code_challenge"));
  assert.doesNotMatch(r.headers.get("Location"), /token|code=/);
  assert.match(r.headers.get("Set-Cookie"), /SameSite=Lax/);
  assert.equal(
    (
      await f.request(
        `/auth/callback?state=${u.searchParams.get("state")}&code=test`,
        { owner: false, headers: { cookie } },
      )
    ).status,
    400,
  );
  assert.equal(
    (await f.request("/auth/logout", { method: "POST", body: "{}" })).status,
    200,
  );
  assert.equal((await f.request("/api/codes")).status, 401);
});
test("OAuth rejects non-owner and expired flow", async () => {
  const start = await f.request("/auth/login", { owner: false }),
    u = new URL(start.headers.get("Location")),
    cookie = start.headers.get("Set-Cookie").split(";")[0];
  globalThis.fetch = async (url) =>
    new Response(
      String(url).includes("access_token")
        ? '{"access_token":"server-only"}'
        : '{"id":123}',
    );
  assert.equal(
    (
      await f.request(
        `/auth/callback?state=${u.searchParams.get("state")}&code=test`,
        { owner: false, headers: { cookie } },
      )
    ).status,
    403,
  );
  const start2 = await f.request("/auth/login", { owner: false }),
    u2 = new URL(start2.headers.get("Location"));
  await f.DB.prepare("UPDATE oauth_flows SET expires_at=0").run();
  assert.equal(
    (
      await f.request(
        `/auth/callback?state=${u2.searchParams.get("state")}&code=test`,
        {
          owner: false,
          headers: { cookie: start2.headers.get("Set-Cookie").split(";")[0] },
        },
      )
    ).status,
    400,
  );
});
test("pagination does not skip equal timestamps; source hashes rotate; missing geo is honest", async () => {
  await Promise.all(
    Array.from({ length: 35 }, (_, i) => f.code({ name: `Code ${i}` })),
  );
  const first = await (await f.request("/api/codes")).json(),
    second = await (
      await f.request("/api/codes?cursor=" + first.next_cursor)
    ).json();
  assert.equal(first.items.length, 30);
  assert.equal(second.items.length, 5);
  assert.equal(
    new Set([...first.items, ...second.items].map((x) => x.id)).size,
    35,
  );
  assert.notEqual(
    await sourceKey(req(), f.env, 100000),
    await sourceKey(req(), f.env, 200000),
  );
  const c = first.items[0];
  await recordVisit(req(), f.env, c, "source");
  const payload = JSON.parse(
    (await f.DB.prepare("SELECT payload FROM email_jobs").first()).payload,
  );
  assert.match(payload.text, /Location unavailable/);
});
test("outbox insertion failure rolls back visit and aggregate together", async () => {
  const c = await f.code();
  await f.DB.prepare(
    "CREATE TRIGGER fail_job BEFORE INSERT ON email_jobs BEGIN SELECT RAISE(ABORT,'simulated failure'); END",
  ).run();
  const r = await f.request(`/r/${c.id}`, { owner: false });
  assert.equal(r.status, 302);
  assert.equal(await count("visits"), 0);
  assert.equal(
    (await f.DB.prepare("SELECT opens FROM codes").first()).opens,
    0,
  );
  assert.equal(await count("email_reservations"), 0);
});
test("alert toggles and disabling stop pending alerts without erasing opens", async () => {
  const c = await f.code({ alerts: false });
  await recordVisit(req(), f.env, c, "one");
  assert.equal(
    (await f.DB.prepare("SELECT reason FROM visits").first()).reason,
    "alerts_off",
  );
  assert.equal(await count("email_jobs"), 0);
  const c2 = await f.code();
  await recordVisit(req(), f.env, c2, "two");
  await f.request(`/api/codes/${c2.id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...c2, active: false }),
  });
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('{"id":"accepted"}');
  };
  await dispatch(f.env);
  assert.equal(calls, 0);
  assert.equal(
    (await f.DB.prepare("SELECT status FROM email_jobs").first()).status,
    "suppressed",
  );
  assert.equal(await count("visits"), 2);
});
test("provider 429 and 5xx retries preserve the payload and honor Retry-After", async () => {
  const c = await f.code(),
    t = now();
  await recordVisit(req(), f.env, c, "one", t);
  globalThis.fetch = async () =>
    new Response('{"name":"rate_limit_exceeded"}', {
      status: 429,
      headers: { "Retry-After": "180" },
    });
  await dispatch(f.env, undefined, t);
  let job = await f.DB.prepare("SELECT * FROM email_jobs").first();
  assert.equal(job.status, "pending");
  assert.equal(job.next_attempt, t + 180);
  globalThis.fetch = async () => new Response("{}", { status: 503 });
  await dispatch(f.env, undefined, t + 181);
  job = await f.DB.prepare("SELECT * FROM email_jobs").first();
  assert.equal(job.status, "pending");
  assert.equal(job.attempts, 2);
});
test("reservation renewal caps sends when an old queued job crosses a budget boundary", async () => {
  f.env.EMAIL_DAILY_BUDGET = "1";
  const c = await f.code(),
    t = now();
  await recordVisit(req(), f.env, c, "old", t - 90000);
  // A synthetic long-lived old job verifies dispatch-time admission independently of deadline.
  await f.DB.prepare("UPDATE email_jobs SET deadline=?")
    .bind(t + 1000)
    .run();
  const c2 = await f.code();
  await recordVisit(req(), f.env, c2, "new", t);
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('{"id":"accepted"}');
  };
  await Promise.all([
    dispatch(f.env, undefined, t),
    dispatch(f.env, undefined, t),
  ]);
  assert.equal(calls, 1);
  assert.equal(
    (
      await f.DB.prepare(
        "SELECT COUNT(*) n FROM email_jobs WHERE reason='email_budget'",
      ).first()
    ).n,
    1,
  );
});
test("visit pagination, invalid input and missing email configuration have explicit behavior", async () => {
  const c = await f.code({ alerts: false }),
    t = now();
  await Promise.all(
    Array.from({ length: 28 }, (_, i) =>
      recordVisit(req(), f.env, c, `source-${i}`, t),
    ),
  );
  const one = await (await f.request(`/api/codes/${c.id}/visits`)).json(),
    two = await (
      await f.request(`/api/codes/${c.id}/visits?cursor=${one.next_cursor}`)
    ).json();
  assert.equal(one.items.length, 25);
  assert.equal(two.items.length, 3);
  assert.equal(new Set([...one.items, ...two.items].map((x) => x.id)).size, 28);
  assert.equal((await f.request("/api/codes?cursor=bad")).status, 400);
  assert.equal(
    (await f.request("/api/codes", { method: "POST", body: "{" })).status,
    400,
  );
  f.env.EMAIL_ENABLED = "false";
  const c2 = await f.code();
  assert.equal(
    (await recordVisit(req(), f.env, c2, "no-email")).reason,
    "email_not_configured",
  );
  assert.equal(
    (await f.request("/api/test-email", { method: "POST", body: "{}" })).status,
    429,
  );
});
