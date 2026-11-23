import webpush from 'web-push';
import { Env, HttpError, hash, now } from './core.ts';
import { localClock } from './schedule.ts';
import { nextDuePage } from './notion.ts';
export function validateSubscription(value: any) {
  let url: URL;
  try { url = new URL(value?.endpoint); } catch { throw new HttpError(400, 'Invalid push subscription.'); }
  const hosts = ['web.push.apple.com', 'fcm.googleapis.com', 'updates.push.services.mozilla.com'];
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.some(h=>url.hostname === h || (h !== 'fcm.googleapis.com' && url.hostname.endsWith(`.${h}`)))) throw new HttpError(400, 'Unsupported push provider.');
  if (!/^[\w-]{87}={0,2}$/.test(value.keys?.p256dh) || !/^[\w-]{22}={0,2}$/.test(value.keys?.auth)) throw new HttpError(400, 'Invalid subscription keys.');
  return { endpoint:url.href, keys:{ p256dh:value.keys.p256dh, auth:value.keys.auth } };
}
export async function sendPush(e: Env, subscription: any, test = false) {
  if (!e.VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY) throw new HttpError(503, 'Push notifications are not configured yet.');
  const request = webpush.generateRequestDetails(subscription, JSON.stringify({ title: test ? 'You’re all set' : 'A little practice, a lasting memory', body: test ? 'Your card reminders can reach this device.' : 'You have cards ready to review.', url:'/remember/' }), {
    vapidDetails:{ subject:e.VAPID_SUBJECT, publicKey:e.VAPID_PUBLIC_KEY, privateKey:e.VAPID_PRIVATE_KEY }, TTL:3600, urgency:'normal',
  });
  const r = await fetch(request.endpoint, { method:'POST', headers:request.headers as Record<string,string>, body:request.body as unknown as ArrayBuffer, redirect:'error', signal:AbortSignal.timeout(10000) });
  return r.status;
}
export async function reminders(e: Env, at = new Date()) {
  await e.DB.batch([
    e.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now()),
    e.DB.prepare('DELETE FROM oauth_flows WHERE expires_at<?').bind(now()),
    e.DB.prepare("DELETE FROM reviews WHERE state!='pending' AND created_at<?").bind(Date.now()-90*86400000),
    e.DB.prepare('DELETE FROM notifications WHERE day<?').bind(new Date(at.getTime()-32*86400000).toISOString().slice(0,10)),
  ]);
  const s: any = await e.DB.prepare('SELECT * FROM settings WHERE id=1').first();
  if (!s.enabled || !e.NOTION_TOKEN || !e.VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY) return;
  const clock = localClock(at, s.timezone);
  if (clock.hour !== s.hour) return;
  const subscriptions = (await e.DB.prepare('SELECT * FROM subscriptions LIMIT 10').all()).results;
  if (!subscriptions.length || !(await nextDuePage(e, s.timezone, at)).cards.length) return;
  for (const sub of subscriptions) {
    const claimed = await e.DB.prepare("INSERT OR IGNORE INTO notifications(subscription_id,day,status) VALUES(?,?,'sending')").bind(sub.id, clock.day).run();
    if (!claimed.meta.changes) continue;
    let status: number;
    try { status = await sendPush(e, JSON.parse(sub.subscription as string)); } catch { status = 0; }
    if (status === 404 || status === 410) await e.DB.prepare('DELETE FROM subscriptions WHERE id=?').bind(sub.id).run();
    await e.DB.prepare('UPDATE notifications SET status=? WHERE subscription_id=? AND day=?').bind(status >= 200 && status < 300 ? 'accepted' : `failed:${status}`, sub.id, clock.day).run();
  }
}
