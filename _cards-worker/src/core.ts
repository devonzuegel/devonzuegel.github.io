export interface Env {
  DB: D1Database; AUTH_LIMIT: RateLimit;
  DASHBOARD_ORIGIN: string; PUBLIC_ORIGIN: string; OWNER_GITHUB_ID: string;
  GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string; RATE_HASH_SECRET: string;
  NOTION_TOKEN: string; NOTION_DATA_SOURCE: string;
  VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string; VAPID_SUBJECT: string;
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const now = () => Math.floor(Date.now() / 1000);
export const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
export const random = (bytes = 24) => b64(crypto.getRandomValues(new Uint8Array(bytes)));
export const hash = async (value: string) => b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
export async function sourceKey(req: Request, e: Env, time: number) {
  if (!e.RATE_HASH_SECRET || e.RATE_HASH_SECRET.length < 32) throw new HttpError(503, 'Sign-in is not configured.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(e.RATE_HASH_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${Math.floor(time/86400)}:${req.headers.get('cf-connecting-ip') || 'unknown'}`))));
}
export const cookie = (_e: Env, name: string, value: string, age: number) => `__Host-cards_${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
export const getCookie = (req: Request, _e: Env, name: string) => req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`__Host-cards_${name}=`))?.split('=')[1] || '';
export async function body(req: Request): Promise<any> {
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Use JSON.');
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing request.');
  let size = 0, text = ''; const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 8192) { await reader.cancel(); throw new HttpError(413, 'Request too large.'); }
    text += decoder.decode(value, { stream: true });
  }
  try { const value = JSON.parse(text + decoder.decode()); if (!value || Array.isArray(value) || typeof value !== 'object') throw Error(); return value; }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
}
