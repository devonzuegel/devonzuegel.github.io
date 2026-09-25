export interface Env {
  DB: D1Database;
  SOURCE_LIMIT: RateLimit;
  GLOBAL_LIMIT: RateLimit;
  AUTH_LIMIT: RateLimit;
  DASHBOARD_ORIGIN: string;
  PUBLIC_ORIGIN: string;
  OWNER_GITHUB_ID: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  RATE_HASH_SECRET: string;
  EMAIL_FROM: string;
  ALERT_RECIPIENT?: string;
  RESEND_API_KEY?: string;
  EMAIL_ENABLED?: string;
  EMAIL_DAILY_BUDGET?: string;
  EMAIL_MONTHLY_BUDGET?: string;
  LOG_DAILY_LIMIT?: string;
  CODE_COOLDOWN_SECONDS?: string;
  SOURCE_COOLDOWN_SECONDS?: string;
  VISIT_RETENTION_DAYS?: string;
  LOCAL_DEV?: string;
}
export interface Code {
  id: string;
  name: string;
  destination: string;
  placement: string;
  alerts: number;
  active: number;
  created_at: number;
  updated_at: number;
  opens: number;
  last_open: number | null;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const now = () => Math.floor(Date.now() / 1000);
export function number(
  value: string | undefined,
  fallback: number,
  max: number,
) {
  return Math.min(
    max,
    Math.max(
      1,
      Number.isFinite(Number(value)) && value
        ? Math.floor(Number(value))
        : fallback,
    ),
  );
}
export const dailyBudget = (e: Env) => number(e.EMAIL_DAILY_BUDGET, 80, 90);
export const monthlyBudget = (e: Env) =>
  number(e.EMAIL_MONTHLY_BUDGET, 2400, 2700);
export const emailReady = (e: Env) =>
  e.EMAIL_ENABLED === "true" &&
  !!e.RESEND_API_KEY &&
  !!e.ALERT_RECIPIENT &&
  !!e.EMAIL_FROM;
export const local = (e: Env) =>
  e.LOCAL_DEV === "true" &&
  e.PUBLIC_ORIGIN === "http://localhost:8787" &&
  e.DASHBOARD_ORIGIN === "http://localhost:8000";
export function random(bytes = 24) {
  return b64(crypto.getRandomValues(new Uint8Array(bytes)));
}
export function b64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export async function hash(text: string) {
  return b64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  );
}
export async function sourceKey(req: Request, e: Env, time: number) {
  if (!e.RATE_HASH_SECRET || e.RATE_HASH_SECRET.length < 32)
    throw new HttpError(503, "Abuse protection is not configured.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(e.RATE_HASH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(
          `${Math.floor(time / 86400)}:${req.headers.get("cf-connecting-ip") || "unknown"}`,
        ),
      ),
    ),
  );
}
export function destination(value: unknown, e: Pick<Env, "PUBLIC_ORIGIN">) {
  if (
    typeof value !== "string" ||
    value.trim().length > 2048 ||
    /[\u0000-\u0020\u007f\\]/.test(value.trim())
  )
    throw new HttpError(400, "Enter a valid website URL without spaces.");
  let raw = value.trim();
  // Host:port is a pasted website; explicit non-HTTP schemes remain forbidden.
  if (!/^[a-z][a-z\d+.-]*:/i.test(raw) || /^[\w.-]+:\d+(?:\/|$)/.test(raw))
    raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, "Enter a valid website URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password
  )
    throw new HttpError(
      400,
      "Use an HTTP or HTTPS URL without embedded credentials.",
    );
  if (
    url.hostname.replace(/\.$/, "").toLowerCase() ===
    new URL(e.PUBLIC_ORIGIN).hostname.toLowerCase()
  )
    throw new HttpError(
      400,
      "A destination cannot point back to the QR backend.",
    );
  return url.href;
}
export function codeFields(body: Record<string, unknown>, e: Env) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const placement =
    typeof body.placement === "string" ? body.placement.trim() : "";
  if (
    !name ||
    name.length > 120 ||
    placement.length > 300 ||
    /[\u0000-\u001f\u007f]/.test(name + placement)
  )
    throw new HttpError(
      400,
      "Use a name up to 120 characters and a note up to 300 characters.",
    );
  if (
    typeof body.alerts !== "boolean" ||
    (body.active !== undefined && typeof body.active !== "boolean")
  )
    throw new HttpError(
      400,
      "Alert and active settings must be true or false.",
    );
  return {
    name,
    placement,
    destination: destination(body.destination, e),
    alerts: body.alerts ? 1 : 0,
    active: body.active === false ? 0 : 1,
  };
}
export const publicCode = (c: Code, e: Env) => ({
  ...c,
  alerts: !!c.alerts,
  active: !!c.active,
  tracking_url: `${e.PUBLIC_ORIGIN}/r/${c.id}`,
});
export function eligible(req: Request) {
  if (req.method !== "GET") return false;
  if (
    /prefetch|prerender|preview/i.test(
      [
        req.headers.get("purpose"),
        req.headers.get("sec-purpose"),
        req.headers.get("x-purpose"),
        req.headers.get("x-moz"),
      ].join(" "),
    )
  )
    return false;
  return !/bot|spider|crawler|slack|discord|facebookexternalhit|facebot|twitter|linkedin|whatsapp|telegram|skypeuripreview|microsoftpreview|googleweblight|pinterest|embedly|iframely|lighthouse|headlesschrome/i.test(
    req.headers.get("user-agent") || "",
  );
}
export function geo(req: Request) {
  const cf = (req as Request & { cf?: Record<string, unknown> }).cf;
  const val = (x: unknown) =>
    typeof x === "string" && x.length <= 120
      ? x.replace(/[\u0000-\u001f]/g, "")
      : null;
  return {
    city: val(cf?.city),
    region: val(cf?.region),
    country: val(cf?.country),
  };
}
export function location(g: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}) {
  return (
    [g.city, g.region, g.country].filter(Boolean).join(", ") ||
    "Location unavailable"
  );
}
export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function emailPayload(
  c: Code | null,
  g: ReturnType<typeof geo>,
  time: number,
  e: Env,
) {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "long",
    timeStyle: "long",
  }).format(new Date(time * 1000));
  const text = c
    ? `QR code: ${c.name}\nPlacement: ${c.placement || "Not specified"}\nOpened: ${date} (America/New_York)\nApproximate location: ${location(g)}\nDestination: ${c.destination}\n\nView this code: ${e.DASHBOARD_ORIGIN}/QR-codes/#/codes/${c.id}\n\nLocation is estimated from the visitor's internet connection and may be inaccurate.`
    : `This is your requested QR alerts test email.\nSent: ${date} (America/New_York)\n\nDashboard: ${e.DASHBOARD_ORIGIN}/QR-codes/`;
  return JSON.stringify({
    from: e.EMAIL_FROM,
    to: [e.ALERT_RECIPIENT],
    subject: c
      ? `QR opened: ${c.name} — ${location(g)}`
      : "QR alerts: test email",
    text,
    html: `<div style="font-family: sans-serif; line-height: 1.6; white-space: pre-wrap">${escapeHtml(text)}</div>`,
  });
}
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
export function page(message: string, status: number) {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>QR link</title><main style="max-width:36rem;margin:15vh auto;padding:2rem;font:18px/1.6 system-ui"><h1>QR link</h1><p>${escapeHtml(message)}</p></main></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
export const cookieName = (e: Env, name: string) =>
  `${local(e) ? "qr_" : "__Host-qr_"}${name}`;
export function cookie(e: Env, name: string, value: string, age: number) {
  return `${cookieName(e, name)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${local(e) ? "" : "; Secure"}`;
}
export function getCookie(req: Request, e: Env, name: string) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(`${cookieName(e, name)}=`))
      ?.split("=")[1] || ""
  );
}
export async function body(req: Request) {
  if (!(req.headers.get("content-type") || "").startsWith("application/json"))
    throw new HttpError(415, "Use application/json.");
  if (Number(req.headers.get("content-length") || 0) > 8192)
    throw new HttpError(413, "Request too large.");
  const reader = req.body?.getReader();
  let size = 0,
    text = "";
  const decoder = new TextDecoder();
  if (reader)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new HttpError(413, "Request too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
  try {
    const obj = JSON.parse(text + decoder.decode());
    if (!obj || Array.isArray(obj) || typeof obj !== "object")
      throw new Error();
    return obj as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export function cursor(value: string | null) {
  if (!value) return null;
  if (!/^\d{1,13}:[A-Za-z0-9_-]{16,64}$/.test(value))
    throw new HttpError(400, "Invalid page cursor.");
  const [t, id] = value.split(":");
  return { time: Number(t), id };
}
export const operationalError = (code: string) =>
  console.error(JSON.stringify({ event: code })); // Never log exception, URL, IP, cookie or provider response.
