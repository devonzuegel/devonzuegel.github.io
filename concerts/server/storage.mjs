import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
const directory =
  process.env.CONCERTS_DATA_DIR ||
  new URL("../.data/", import.meta.url).pathname;
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const storageMode =
  url && token ? "redis" : process.env.VERCEL ? "unconfigured" : "local";
async function command(args) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error("Sync storage is temporarily unavailable.");
  const d = await r.json();
  if (d.error) throw new Error("Sync storage rejected the request.");
  return d.result;
}
const key = (k) => "concerts:v1:" + k;
const path = (k) =>
  join(directory, createHash("sha256").update(k).digest("hex") + ".json");
const queues = new Map();
export async function get(k) {
  if (storageMode === "unconfigured")
    throw new Error("Cloud sync needs a Redis connection.");
  if (storageMode === "redis") {
    const raw = await command(["GET", key(k)]);
    return raw ? JSON.parse(raw) : null;
  }
  try {
    return JSON.parse(await readFile(path(k), "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
export async function update(k, fn) {
  if (storageMode === "unconfigured")
    throw new Error("Cloud sync needs a Redis connection.");
  if (storageMode === "redis") {
    for (let i = 0; i < 8; i++) {
      const raw = await command(["GET", key(k)]),
        next = await fn(raw ? JSON.parse(raw) : null);
      const json = JSON.stringify(next);
      const script =
        "local old=redis.call('GET',KEYS[1]); if (old or '') ~= ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1";
      const ok = await command(["EVAL", script, 1, key(k), raw || "", json]);
      if (ok) return next;
    }
    throw new Error("Another device is saving. Please try again.");
  }
  const previous = queues.get(k) || Promise.resolve();
  let release;
  const lock = new Promise((r) => (release = r));
  const nextQueue = previous.catch(() => {}).then(() => lock);
  queues.set(k, nextQueue);
  await previous.catch(() => {});
  try {
    const next = await fn(await get(k));
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const tmp = path(k) + "." + randomUUID();
    await writeFile(tmp, JSON.stringify(next), { mode: 0o600 });
    await rename(tmp, path(k));
    return next;
  } finally {
    release();
    if (queues.get(k) === nextQueue) queues.delete(k);
  }
}
export const set = (k, value) => update(k, () => value);
