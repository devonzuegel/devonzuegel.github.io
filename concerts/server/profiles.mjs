import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import * as store from "./storage.mjs";
export const username = (s) => {
  const n = String(s || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(n))
    throw Object.assign(
      new Error("Use 3–32 letters, numbers, underscores or hyphens."),
      { status: 400 },
    );
  return n;
};
const digest = (s) => createHash("sha256").update(s).digest("hex");
export function verify(profile, code) {
  if (!profile || !code) return false;
  const given = digest(code);
  return timingSafeEqual(Buffer.from(profile.codeHash), Buffer.from(given));
}
export function publicProfile(p) {
  return {
    username: p.username,
    fields: p.fields || {},
    revision: p.revision || 0,
    conflicts: p.conflicts || [],
    createdAt: p.createdAt,
    spotify: p.spotify
      ? { connected: true, updatedAt: p.spotify.updatedAt }
      : null,
  };
}
export async function createProfile(name) {
  name = username(name);
  const code = randomBytes(18).toString("base64url");
  const p = await store.update("profile:" + name, (old) => {
    if (old)
      throw Object.assign(
        new Error(
          "That username is taken. Sign in with its sync code, or choose another.",
        ),
        { status: 409 },
      );
    return {
      username: name,
      codeHash: digest(code),
      fields: {},
      revision: 0,
      conflicts: [],
      seen: [],
      createdAt: new Date().toISOString(),
    };
  });
  return { ...publicProfile(p), code };
}
export async function authenticate(name, code) {
  const p = await store.get("profile:" + username(name));
  if (!verify(p, code))
    throw Object.assign(new Error("Username or sync code is incorrect."), {
      status: 401,
    });
  return p;
}
export function validateOp(op) {
  try {
    if (
      !op ||
      typeof op.id !== "string" ||
      op.id.length > 100 ||
      typeof op.key !== "string" ||
      op.key.length > 240
    )
      throw Object.assign(new Error("Invalid change."), { status: 400 });
    const v = op.value;
    if (
      /^event\/[a-zA-Z0-9_.:-]+\/(saved|hidden|notes|music|venue|visuals|snapshot)$/.test(
        op.key,
      )
    ) {
      const field = op.key.split("/")[2];
      if (["saved", "hidden"].includes(field) && typeof v !== "boolean")
        throw new Error("Invalid bookmark.");
      if (field === "notes" && (typeof v !== "string" || v.length > 30000))
        throw new Error("Notes must be under 30,000 characters.");
      if (
        ["music", "venue", "visuals"].includes(field) &&
        v !== null &&
        (!Number.isInteger(v) || v < 1 || v > 5)
      )
        throw new Error("Ratings must be 1–5.");
      if (field === "snapshot" && (!v?.id || JSON.stringify(v).length > 30000))
        throw new Error("Invalid concert.");
    } else if (/^city\/[a-zA-Z0-9_.:-]+$/.test(op.key)) {
      if (
        !v ||
        typeof v.name !== "string" ||
        v.name.length > 100 ||
        !Number.isFinite(v.lat) ||
        !Number.isFinite(v.lng) ||
        Math.abs(v.lat) > 90 ||
        Math.abs(v.lng) > 180 ||
        !Number.isFinite(v.radius) ||
        v.radius < 1 ||
        v.radius > 200
      )
        throw new Error("Invalid city.");
    } else if (op.key === "listening") {
      if (
        v !== null &&
        (typeof v !== "object" || JSON.stringify(v).length > 1500000)
      )
        throw new Error("Listening import is too large.");
    } else if (/^conflict\/[a-zA-Z0-9_-]+$/.test(op.key)) {
      if (v !== null) throw new Error("Invalid conflict resolution.");
    } else
      throw Object.assign(new Error("Unsupported change."), { status: 400 });
    if (!Number.isInteger(op.baseRev) || op.baseRev < 0)
      throw new Error("Missing change revision.");
  } catch (e) {
    e.status = 400;
    throw e;
  }
}
export function applyOperations(
  input,
  operations,
  now = new Date().toISOString(),
) {
  const p = structuredClone(input);
  p.fields ||= {};
  p.conflicts ||= [];
  p.seen ||= [];
  p.revision ||= 0;
  for (const op of operations) {
    validateOp(op);
    if (p.seen.includes(op.id)) continue;
    const previous = p.fields[op.key];
    if (op.key.startsWith("conflict/")) {
      p.conflicts = p.conflicts.filter((c) => c.id !== op.key.slice(9));
    } else if (
      op.key.endsWith("/notes") &&
      previous &&
      previous.rev !== op.baseRev &&
      previous.value !== op.value
    ) {
      p.conflicts.push({
        id: op.id,
        key: op.key,
        incoming: op.value,
        existing: previous.value,
        at: now,
      });
    } else {
      p.revision++;
      p.fields[op.key] = { value: op.value, rev: p.revision, at: now };
    }
    p.seen.push(op.id);
  }
  p.seen = p.seen.slice(-3000);
  return p;
}
export async function syncProfile(name, code, ops = []) {
  if (!Array.isArray(ops) || ops.length > 300)
    throw Object.assign(new Error("Too many changes in one request."), {
      status: 400,
    });
  ops.forEach(validateOp);
  const p = await store.update("profile:" + username(name), (old) => {
    if (!verify(old, code))
      throw Object.assign(new Error("Sign in again to sync."), { status: 401 });
    return applyOperations(old, ops);
  });
  return { ...publicProfile(p), acknowledged: ops.map((o) => o.id) };
}
