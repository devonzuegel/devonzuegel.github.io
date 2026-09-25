import {
  type Env,
  type Code,
  now,
  random,
  geo,
  emailPayload,
  emailReady,
  dailyBudget,
  monthlyBudget,
  number,
  operationalError,
} from "./core.ts";
// Sliding windows are deliberately stricter than the provider's calendar-month quota.
const budgetSQL = `(SELECT COUNT(*) FROM email_reservations WHERE reserved_at>?)>=? OR (SELECT COUNT(*) FROM email_reservations WHERE reserved_at>?)>=?`;
export function budgetBindings(e: Env, t: number) {
  return [t - 86400, dailyBudget(e), t - 31 * 86400, monthlyBudget(e)];
}
export async function recordVisit(
  req: Request,
  e: Env,
  c: Code,
  source: string,
  t = now(),
) {
  const id = random(16),
    job = random(16),
    g = geo(req),
    day = new Date(t * 1000).toISOString().slice(0, 10),
    cooldown = `${c.id}:${source}`;
  // D1 batch is a transaction: admission, snapshot, job and reservation commit together.
  const result = await e.DB.batch([
    e.DB.prepare(
      "INSERT OR IGNORE INTO daily_logging(day,count) VALUES(?,0)",
    ).bind(day),
    e.DB.prepare(
      `INSERT INTO visits(id,code_id,opened_at,city,region,country,email_status,reason)
      SELECT ?,?,?,?,?,?,'suppressed',CASE
        WHEN alerts=0 THEN 'alerts_off'
        WHEN ?=0 THEN 'email_not_configured'
        WHEN EXISTS(SELECT 1 FROM operations WHERE key='email_pause' AND expires_at>?) THEN 'provider_paused'
        WHEN EXISTS(SELECT 1 FROM cooldowns WHERE key=? AND expires_at>?) THEN 'source_cooldown'
        WHEN EXISTS(SELECT 1 FROM email_jobs WHERE code_id=? AND created_at>?) THEN 'code_cooldown'
        WHEN ${budgetSQL} THEN 'email_budget'
        ELSE NULL END
      FROM codes WHERE id=? AND active=1 AND (SELECT count FROM daily_logging WHERE day=?)<?`,
    ).bind(
      id,
      c.id,
      t,
      g.city,
      g.region,
      g.country,
      emailReady(e) ? 1 : 0,
      t,
      cooldown,
      t,
      c.id,
      t - number(e.CODE_COOLDOWN_SECONDS, 15, 3600),
      ...budgetBindings(e, t),
      c.id,
      day,
      number(e.LOG_DAILY_LIMIT, 1000, 2000),
    ),
    e.DB.prepare(
      "UPDATE visits SET email_status='pending' WHERE id=? AND reason IS NULL",
    ).bind(id),
    e.DB.prepare(
      `INSERT INTO email_jobs(id,visit_id,code_id,payload,status,created_at,deadline,next_attempt)
      SELECT ?,id,code_id,?,'pending',?,?,? FROM visits WHERE id=? AND email_status='pending'`,
    ).bind(job, emailPayload(c, g, t, e), t, t + 6 * 3600, t, id),
    e.DB.prepare(
      "INSERT INTO email_reservations(id,reserved_at) SELECT id,? FROM email_jobs WHERE id=?",
    ).bind(t, job),
    e.DB.prepare(
      `INSERT INTO cooldowns(key,expires_at) SELECT ?,? FROM email_jobs WHERE id=?
      ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at`,
    ).bind(cooldown, t + number(e.SOURCE_COOLDOWN_SECONDS, 300, 3600), job),
    e.DB.prepare("SELECT id,email_status,reason FROM visits WHERE id=?").bind(
      id,
    ),
  ]);
  return result[6].results[0] || null;
}
export async function queueTest(e: Env, t = now()) {
  const id = random(16);
  const results = await e.DB.batch([
    e.DB.prepare(
      `INSERT INTO email_jobs(id,kind,payload,status,created_at,deadline,next_attempt)
      SELECT ?,'test',?,'pending',?,?,? WHERE ?=1
      AND NOT EXISTS(SELECT 1 FROM cooldowns WHERE key='test_email' AND expires_at>?)
      AND NOT EXISTS(SELECT 1 FROM operations WHERE key='email_pause' AND expires_at>?)
      AND NOT (${budgetSQL})`,
    ).bind(
      id,
      emailPayload(null, { city: null, region: null, country: null }, t, e),
      t,
      t + 21600,
      t,
      emailReady(e) ? 1 : 0,
      t,
      t,
      ...budgetBindings(e, t),
    ),
    e.DB.prepare(
      "INSERT INTO email_reservations(id,reserved_at) SELECT id,? FROM email_jobs WHERE id=?",
    ).bind(t, id),
    e.DB.prepare(
      `INSERT INTO cooldowns(key,expires_at) SELECT 'test_email',? FROM email_jobs WHERE id=? ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at`,
    ).bind(t + 300, id),
    e.DB.prepare("SELECT id,status FROM email_jobs WHERE id=?").bind(id),
  ]);
  return results[3].results[0] || null;
}
interface Job {
  id: string;
  code_id: string | null;
  payload: string;
  attempts: number;
  deadline: number;
  claim_token: string;
}
export async function dispatch(e: Env, onlyId?: string, t = now()) {
  if (!emailReady(e)) return;
  const candidates = await e.DB.prepare(
    `SELECT id FROM email_jobs WHERE status='pending' AND next_attempt<=? ${onlyId ? "AND id=?" : ""} ORDER BY next_attempt LIMIT 5`,
  )
    .bind(...(onlyId ? [t, onlyId] : [t]))
    .all<{ id: string }>();
  for (const candidate of candidates.results) {
    const claim = random();
    const result = await e.DB.batch([
      // Extending a reservation before EVERY attempt bounds distinct sends in any rolling window,
      // even across midnight, long retries and concurrent cron/fetch invocations.
      e.DB.prepare(
        `UPDATE email_jobs SET status='suppressed',reason='email_budget'
        WHERE id=? AND status='pending' AND next_attempt<=? AND (
          (SELECT COUNT(*) FROM email_reservations WHERE reserved_at>? AND id<>?)>=? OR
          (SELECT COUNT(*) FROM email_reservations WHERE reserved_at>? AND id<>?)>=?)`,
      ).bind(
        candidate.id,
        t,
        t - 86400,
        candidate.id,
        dailyBudget(e),
        t - 31 * 86400,
        candidate.id,
        monthlyBudget(e),
      ),
      e.DB.prepare(
        `UPDATE email_jobs SET status='failed',reason='retry_window_ended' WHERE id=? AND status='pending' AND (deadline<=? OR attempts>=5)`,
      ).bind(candidate.id, t),
      e.DB.prepare(
        `UPDATE email_jobs SET status='suppressed',reason='code_disabled' WHERE id=? AND status='pending' AND code_id IN (SELECT id FROM codes WHERE active=0)`,
      ).bind(candidate.id),
      e.DB.prepare(
        `UPDATE email_jobs SET status='suppressed',reason='provider_paused' WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM operations WHERE key='email_pause' AND expires_at>?)`,
      ).bind(candidate.id, t),
      e.DB.prepare(
        `UPDATE email_jobs SET status='sending',claim_token=?,lease_until=?,attempts=attempts+1
        WHERE id=? AND status='pending' AND next_attempt<=? RETURNING id,code_id,payload,attempts,deadline,claim_token`,
      ).bind(claim, t + 120, candidate.id, t),
      e.DB.prepare(
        `UPDATE email_reservations SET reserved_at=? WHERE id=? AND EXISTS(SELECT 1 FROM email_jobs WHERE id=? AND claim_token=? AND status='sending')`,
      ).bind(t, candidate.id, candidate.id, claim),
    ]);
    const job = result[4].results[0] as unknown as Job | undefined;
    if (!job) continue;
    let status = "pending",
      reason = "network_error",
      providerId: string | null = null,
      retry = 60 * Math.pow(2, job.attempts - 1);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${e.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `qr/${job.id}`,
        },
        body: job.payload,
        signal: AbortSignal.timeout(10000),
      });
      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        name?: string;
      };
      if (response.ok && typeof data.id === "string") {
        status = "accepted";
        reason = "";
        providerId = data.id;
      } else if (
        ["daily_quota_exceeded", "monthly_quota_exceeded"].includes(
          data.name || "",
        )
      ) {
        status = "suppressed";
        reason = data.name!;
        // A rolling pause is conservative and never causes a reset-time backlog.
        await e.DB.prepare(
          `INSERT INTO operations(key,value,expires_at) VALUES('email_pause',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires_at=excluded.expires_at`,
        )
          .bind(
            reason,
            t + (reason === "monthly_quota_exceeded" ? 31 * 86400 : 86400),
          )
          .run();
      } else if (
        response.status === 429 ||
        response.status >= 500 ||
        data.name === "concurrent_idempotent_requests"
      ) {
        reason =
          response.status === 429
            ? "provider_rate_limit"
            : "provider_temporary_error";
        const wait = Number(response.headers.get("retry-after"));
        if (Number.isFinite(wait))
          retry = Math.max(retry, Math.min(3600, wait));
      } else {
        status = "failed";
        reason =
          response.status === 401 || response.status === 403
            ? "provider_configuration"
            : "provider_rejected";
      }
    } catch {
      /* Sanitize errors: no provider payload, recipient, token or request URL is logged. */
    }
    if (
      status === "pending" &&
      (job.attempts >= 5 || t + retry >= job.deadline)
    ) {
      status = "failed";
      reason = "retry_window_ended";
    }
    await e.DB.prepare(
      `UPDATE email_jobs SET status=?,reason=?,provider_id=?,next_attempt=?,lease_until=NULL,claim_token=NULL WHERE id=? AND claim_token=? AND status='sending'`,
    )
      .bind(status, reason || null, providerId, t + retry, job.id, claim)
      .run();
    // Conservative pacing for scheduled drains; account-wide 429s still back off.
    if (candidates.results.length > 1)
      await new Promise((resolve) => setTimeout(resolve, 600));
  }
}
export async function maintenance(e: Env, t = now()) {
  // Recover a lost lease with the SAME payload and idempotency key, always inside 6h (<24h).
  await e.DB.batch([
    e.DB.prepare(
      `UPDATE email_jobs SET status='pending',claim_token=NULL,lease_until=NULL WHERE id IN (SELECT id FROM email_jobs WHERE status='sending' AND lease_until<? LIMIT 100)`,
    ).bind(t),
    e.DB.prepare(
      `UPDATE email_jobs SET status='failed',reason='retry_window_ended' WHERE id IN (SELECT id FROM email_jobs WHERE status='pending' AND deadline<=? LIMIT 100)`,
    ).bind(t),
  ]);
  const cutoff = t - number(e.VISIT_RETENTION_DAYS, 90, 90) * 86400;
  await e.DB.batch([
    e.DB.prepare(
      "DELETE FROM visits WHERE id IN (SELECT id FROM visits WHERE opened_at<? LIMIT 100)",
    ).bind(cutoff),
    e.DB.prepare(
      "DELETE FROM email_jobs WHERE id IN (SELECT id FROM email_jobs WHERE created_at<? LIMIT 100)",
    ).bind(cutoff),
    e.DB.prepare(
      "DELETE FROM cooldowns WHERE key IN (SELECT key FROM cooldowns WHERE expires_at<? LIMIT 100)",
    ).bind(t),
    e.DB.prepare(
      "DELETE FROM oauth_flows WHERE state_hash IN (SELECT state_hash FROM oauth_flows WHERE expires_at<? LIMIT 100)",
    ).bind(t),
    e.DB.prepare(
      "DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE expires_at<? LIMIT 100)",
    ).bind(t),
    e.DB.prepare(
      "DELETE FROM email_reservations WHERE id IN (SELECT id FROM email_reservations WHERE reserved_at<? LIMIT 100)",
    ).bind(t - 32 * 86400),
    e.DB.prepare(
      "DELETE FROM daily_logging WHERE day<date(?,'unixepoch','-2 days')",
    ).bind(t),
    e.DB.prepare("DELETE FROM operations WHERE expires_at<?").bind(t),
  ]);
}
export async function background(e: Env) {
  try {
    await maintenance(e);
    await dispatch(e);
  } catch {
    operationalError("outbox_or_maintenance_failed");
  }
}
