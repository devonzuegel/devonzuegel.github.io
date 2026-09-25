import {
  type Env,
  type Code,
  HttpError,
  now,
  random,
  sourceKey,
  destination,
  codeFields,
  publicCode,
  eligible,
  json,
  page,
  body,
  cursor,
  emailReady,
  dailyBudget,
  monthlyBudget,
  number,
  local,
  operationalError,
} from "./core.ts";
import { session, auth } from "./auth.ts";
import { recordVisit, queueTest, dispatch, background } from "./outbox.ts";
const columns =
  "id,name,destination,placement,alerts,active,created_at,updated_at,opens,last_open";
async function getCode(e: Env, id: string) {
  return e.DB.prepare(`SELECT ${columns} FROM codes WHERE id=?`)
    .bind(id)
    .first<Code>();
}
async function settings(e: Env) {
  const t = now();
  const r = await e.DB.batch([
    e.DB.prepare(
      "SELECT COUNT(*) AS count FROM email_reservations WHERE reserved_at>?",
    ).bind(t - 86400),
    e.DB.prepare(
      "SELECT COUNT(*) AS count FROM email_reservations WHERE reserved_at>?",
    ).bind(t - 31 * 86400),
    e.DB.prepare(
      "SELECT value,expires_at FROM operations WHERE key='email_pause' AND expires_at>?",
    ).bind(t),
    e.DB.prepare(
      "SELECT id,kind,status,reason,created_at FROM email_jobs WHERE status IN ('failed','suppressed') ORDER BY created_at DESC LIMIT 10",
    ),
    e.DB.prepare(
      "SELECT id,status,reason,created_at FROM email_jobs WHERE kind='test' ORDER BY created_at DESC LIMIT 1",
    ),
    e.DB.prepare("SELECT count FROM daily_logging WHERE day=?").bind(
      new Date(t * 1000).toISOString().slice(0, 10),
    ),
  ]);
  return {
    recipient: e.ALERT_RECIPIENT || null,
    email_ready: emailReady(e),
    readiness_note:
      "Configuration is checked locally. Sender verification and inbox delivery are confirmed only by a test email.",
    budget: {
      day: {
        used: (r[0].results[0] as { count: number }).count,
        limit: dailyBudget(e),
      },
      month: {
        used: (r[1].results[0] as { count: number }).count,
        limit: monthlyBudget(e),
      },
      windows:
        "Rolling 24 hours / 31 days. Reservations include queued, attempted and test emails.",
    },
    pause: r[2].results[0] || null,
    problems: r[3].results,
    last_test: r[4].results[0] || null,
    logging: {
      used: (r[5].results[0] as { count: number } | undefined)?.count || 0,
      limit: number(e.LOG_DAILY_LIMIT, 1000, 2000),
    },
    timezone: "America/New_York",
  };
}
async function admin(
  req: Request,
  e: Env,
  ctx: ExecutionContext,
  path: string,
) {
  const mutate = !["GET", "HEAD"].includes(req.method),
    s = await session(req, e, mutate);
  if (req.method === "HEAD") throw new HttpError(405, "Method not allowed.");
  if (req.method === "GET" && path === "/api/session")
    return json({ csrf: s.csrf });
  if (req.method === "GET" && path === "/api/settings")
    return json(await settings(e));
  if (req.method === "POST" && path === "/api/test-email") {
    await body(req);
    const job = await queueTest(e);
    if (!job)
      throw new HttpError(
        429,
        "Test email not queued. Check email configuration and budgets, or wait five minutes between tests.",
      );
    ctx.waitUntil(dispatch(e).catch(() => operationalError("dispatch_failed")));
    return json(job, 202);
  }
  if (path === "/api/codes" && req.method === "GET") {
    const u = new URL(req.url),
      q = (u.searchParams.get("q") || "").trim().slice(0, 120),
      after = cursor(u.searchParams.get("cursor"));
    // Keyset pagination. Search scans at most 1,000 owner-created codes (enforced at creation).
    const r = await e.DB.prepare(
      `SELECT ${columns} FROM codes WHERE (?='' OR instr(lower(name||' '||placement||' '||destination),lower(?))>0) AND (? IS NULL OR (created_at,id)<(?,?)) ORDER BY created_at DESC,id DESC LIMIT 31`,
    )
      .bind(q, q, after?.time ?? null, after?.time ?? null, after?.id ?? null)
      .all<Code>();
    const items = r.results.slice(0, 30),
      last = items.at(-1);
    return json({
      items: items.map((c) => publicCode(c, e)),
      next_cursor:
        r.results.length > 30 ? `${last!.created_at}:${last!.id}` : null,
    });
  }
  if (path === "/api/codes" && req.method === "POST") {
    const data = await body(req),
      f = codeFields(data, e),
      key = req.headers.get("idempotency-key");
    if (!key || !/^[\w-]{16,80}$/.test(key))
      throw new HttpError(400, "A valid Idempotency-Key is required.");
    const id = random(16),
      t = now();
    await e.DB.prepare(
      `INSERT INTO codes(id,name,destination,placement,alerts,active,created_at,updated_at,request_key) SELECT ?,?,?,?,?,1,?,?,? WHERE (SELECT COUNT(*) FROM codes)<1000 ON CONFLICT(request_key) DO NOTHING`,
    )
      .bind(id, f.name, f.destination, f.placement, f.alerts, t, t, key)
      .run();
    const c = await e.DB.prepare(
      `SELECT ${columns} FROM codes WHERE request_key=?`,
    )
      .bind(key)
      .first<Code>();
    if (!c)
      throw new HttpError(409, "The 1,000-code safety limit has been reached.");
    return json(publicCode(c, e), 201);
  }
  const m = path.match(/^\/api\/codes\/([\w-]{22})(\/visits)?$/);
  if (m) {
    const c = await getCode(e, m[1]);
    if (!c) throw new HttpError(404, "Code not found.");
    if (m[2] && req.method === "GET") {
      const after = cursor(new URL(req.url).searchParams.get("cursor"));
      const r = await e.DB.prepare(
        `SELECT id,opened_at,city,region,country,email_status,reason FROM visits WHERE code_id=? AND (? IS NULL OR (opened_at,id)<(?,?)) ORDER BY opened_at DESC,id DESC LIMIT 26`,
      )
        .bind(c.id, after?.time ?? null, after?.time ?? null, after?.id ?? null)
        .all<{ id: string; opened_at: number }>();
      const items = r.results.slice(0, 25),
        last = items.at(-1);
      return json({
        items,
        next_cursor:
          r.results.length > 25 ? `${last!.opened_at}:${last!.id}` : null,
      });
    }
    if (!m[2] && req.method === "GET") return json(publicCode(c, e));
    if (!m[2] && req.method === "PATCH") {
      const f = codeFields(await body(req), e);
      await e.DB.batch([
        e.DB.prepare(
          "UPDATE codes SET name=?,destination=?,placement=?,alerts=?,active=?,updated_at=? WHERE id=?",
        ).bind(
          f.name,
          f.destination,
          f.placement,
          f.alerts,
          f.active,
          now(),
          c.id,
        ),
        e.DB.prepare(
          "UPDATE email_jobs SET status='suppressed',reason='code_disabled' WHERE code_id=? AND status='pending' AND ?=0",
        ).bind(c.id, f.active),
      ]);
      return json(publicCode((await getCode(e, c.id))!, e));
    }
  }
  throw new HttpError(404, "Not found.");
}
async function route(req: Request, e: Env, ctx: ExecutionContext) {
  const u = new URL(req.url),
    path = u.pathname;
  if (u.origin !== e.PUBLIC_ORIGIN)
    throw new HttpError(404, "Unknown backend origin.");
  if (
    !local(e) &&
    (u.protocol !== "https:" || !e.DASHBOARD_ORIGIN.startsWith("https://"))
  )
    throw new HttpError(503, "HTTPS configuration is required.");
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (path.startsWith("/auth/")) return auth(req, e, path);
  if (path.startsWith("/api/")) return admin(req, e, ctx, path);
  const match = path.match(/^\/r\/([\w-]{22})$/);
  if (!match) return page("This link could not be found.", 404);
  if (!["GET", "HEAD"].includes(req.method))
    throw new HttpError(405, "Use GET or HEAD.");
  const c = await getCode(e, match[1]);
  if (!c) return page("This link could not be found.", 404);
  if (!c.active)
    return page(
      "This QR link is currently unavailable. Please check with the person who shared it.",
      410,
    );
  const dest = destination(c.destination, e);
  if (eligible(req)) {
    try {
      const source = await sourceKey(req, e, now());
      if (
        (await e.SOURCE_LIMIT.limit({ key: source })).success &&
        (await e.GLOBAL_LIMIT.limit({ key: "logging" })).success
      ) {
        await recordVisit(req, e, c, source);
        ctx.waitUntil(
          dispatch(e).catch(() => operationalError("dispatch_failed")),
        );
      }
    } catch {
      operationalError("visit_write_failed");
    }
  }
  return new Response(null, { status: 302, headers: { Location: dest } });
}
export default {
  async fetch(req: Request, e: Env, ctx: ExecutionContext) {
    let r: Response;
    try {
      r = await route(req, e, ctx);
    } catch (err) {
      const known = err instanceof HttpError;
      if (!known) operationalError("request_failed");
      const status = known ? err.status : 503,
        message = known
          ? err.message
          : "Temporarily unavailable. Please try again shortly.";
      r = new URL(req.url).pathname.startsWith("/api/")
        ? json({ error: message }, status)
        : page(message, status);
    }
    r.headers.set("Cache-Control", "no-store");
    r.headers.set("Referrer-Policy", "no-referrer");
    r.headers.set("X-Content-Type-Options", "nosniff");
    r.headers.set("X-Frame-Options", "DENY");
    r.headers.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
    );
    r.headers.set("Vary", "Origin");
    if (req.headers.get("origin") === e.DASHBOARD_ORIGIN) {
      r.headers.set("Access-Control-Allow-Origin", e.DASHBOARD_ORIGIN);
      r.headers.set("Access-Control-Allow-Credentials", "true");
      r.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, OPTIONS",
      );
      r.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, X-CSRF-Token, Idempotency-Key",
      );
    }
    if (req.method === "HEAD")
      return new Response(null, { status: r.status, headers: r.headers });
    return r;
  },
  async scheduled(_event: ScheduledController, e: Env, ctx: ExecutionContext) {
    ctx.waitUntil(background(e));
  },
} satisfies ExportedHandler<Env>;
