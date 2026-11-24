import { auth, session, signInConfigured } from './auth.ts';
import { Env, HttpError, body, hash, json, now } from './core.ts';
import { nextDuePage, review } from './notion.ts';
import { reminders, sendPush, validateSubscription } from './push.ts';
import { progress } from './progress.ts';
async function handle(req: Request, e: Env) {
  const url = new URL(req.url), path = url.pathname;
  if (req.method === 'OPTIONS') {
    if (req.headers.get('origin') !== e.DASHBOARD_ORIGIN) throw new HttpError(403, 'Origin not allowed.');
    return new Response(null, { status:204 });
  }
  if (path.startsWith('/auth/')) return auth(req, e, path);
  const s = await session(req, e, req.method !== 'GET');
  if (path === '/api/session' && req.method === 'GET') return json({ csrf:s.csrf, notionReady:!!e.NOTION_TOKEN, pushKey:e.VAPID_PUBLIC_KEY || null });
  if (path === '/api/pending' && req.method === 'GET') return json((await e.DB.prepare("SELECT id,card_id AS cardId,rating,expected_version AS version FROM reviews WHERE state='pending' ORDER BY created_at LIMIT 50").all()).results);
  if (path === '/api/progress' && req.method === 'GET') return json(await progress(e));
  if (path === '/api/cards' && req.method === 'GET') {
    const settings: any = await e.DB.prepare('SELECT * FROM settings WHERE id=1').first();
    const cursor = url.searchParams.get('cursor') || undefined;
    if (cursor && !/^[\w-]{1,100}$/.test(cursor)) throw new HttpError(400, 'Invalid queue cursor.');
    return json(await nextDuePage(e, settings.timezone, new Date(), cursor));
  }
  if (path === '/api/review' && req.method === 'POST') return json(await review(e, await body(req)));
  if (path === '/api/settings' && req.method === 'GET') {
    const settings = await e.DB.prepare('SELECT * FROM settings WHERE id=1').first();
    const last = await e.DB.prepare('SELECT day,status FROM notifications ORDER BY day DESC LIMIT 1').first();
    return json({ ...settings, last });
  }
  if (path === '/api/settings' && req.method === 'POST') {
    const b = await body(req);
    if (typeof b.enabled !== 'boolean' || !Number.isInteger(b.hour) || b.hour < 0 || b.hour > 23 || typeof b.timezone !== 'string' || b.timezone.length > 80) throw new HttpError(400, 'Choose a valid time and timezone.');
    try { new Intl.DateTimeFormat('en', { timeZone:b.timezone }); } catch { throw new HttpError(400, 'Choose a valid timezone.'); }
    await e.DB.prepare('UPDATE settings SET enabled=?,hour=?,timezone=? WHERE id=1').bind(Number(b.enabled), b.hour, b.timezone).run();
    return json({ ok:true });
  }
  if (path === '/api/subscription' && req.method === 'POST') {
    const b = await body(req), sub = validateSubscription(b.subscription), id = await hash(sub.endpoint);
    const existing = await e.DB.prepare('SELECT id FROM subscriptions WHERE id=?').bind(id).first();
    const count: any = await e.DB.prepare('SELECT COUNT(*) AS n FROM subscriptions').first();
    if (!existing && count.n >= 10) throw new HttpError(400, 'The ten-device limit has been reached.');
    await e.DB.prepare('INSERT INTO subscriptions(id,subscription,created_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET subscription=excluded.subscription').bind(id, JSON.stringify(sub), now()).run();
    return json({ ok:true });
  }
  if (path === '/api/subscription' && req.method === 'DELETE') {
    const sub = validateSubscription((await body(req)).subscription);
    await e.DB.prepare('DELETE FROM subscriptions WHERE id=?').bind(await hash(sub.endpoint)).run();
    return json({ ok:true });
  }
  if (path === '/api/push-test' && req.method === 'POST') {
    if (!(await e.AUTH_LIMIT.limit({ key:'push-test' })).success) throw new HttpError(429, 'Please wait a minute before another test.');
    const sub = validateSubscription((await body(req)).subscription);
    if (!await e.DB.prepare('SELECT id FROM subscriptions WHERE id=?').bind(await hash(sub.endpoint)).first()) throw new HttpError(400, 'Enable notifications on this device first.');
    const status = await sendPush(e, sub, true);
    if (status < 200 || status >= 300) throw new HttpError(502, 'The push service did not accept this notification. Try enabling this device again.');
    return json({ ok:true });
  }
  throw new HttpError(404, 'Not found.');
}
export default {
  async fetch(req: Request, e: Env) {
    let response: Response;
    try { response = await handle(req, e); }
    catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const signInStatus = status === 401 && req.method === 'GET' && new URL(req.url).pathname === '/api/session'
        ? { signInReady: signInConfigured(e) } : {};
      response = json({ error:error instanceof HttpError ? error.message : 'Something went wrong. Please retry.', ...signInStatus }, status);
    }
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('Vary', 'Origin');
    if (req.headers.get('origin') === e.DASHBOARD_ORIGIN) {
      response.headers.set('Access-Control-Allow-Origin', e.DASHBOARD_ORIGIN);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    }
    return response;
  },
  async scheduled(_event: ScheduledEvent, e: Env, ctx: ExecutionContext) { ctx.waitUntil(reminders(e)); },
};
