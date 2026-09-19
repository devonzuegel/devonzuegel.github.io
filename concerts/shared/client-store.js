const operationId = () =>
  globalThis.crypto?.randomUUID?.() ||
  Date.now().toString(36) +
    "-" +
    Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) =>
      n.toString(36),
    ).join("-");
const ACTIVE = "encore.active.v1",
  PREFIX = "encore.profile.v1.";
const empty = () => ({
  fields: {},
  pending: [],
  conflicts: [],
  profile: null,
  code: null,
});
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}
export class ClientStore extends EventTarget {
  constructor(api) {
    super();
    this.api = api;
    this.active = read(ACTIVE, "guest");
    this.data = read(PREFIX + this.active, empty());
    this.inflight = new Set();
    this.busy = false;
    this.status = this.data.profile ? "Connecting" : "On this device";
    this.lastError = "";
  }
  get fields() {
    const f = { ...this.data.fields };
    for (const o of this.data.pending)
      f[o.key] = { value: o.value, rev: o.baseRev, at: o.at };
    return f;
  }
  get profile() {
    return this.data.profile;
  }
  emit() {
    this.dispatchEvent(new Event("change"));
  }
  persist(emit = true) {
    try {
      localStorage.setItem(PREFIX + this.active, JSON.stringify(this.data));
      localStorage.setItem(ACTIVE, JSON.stringify(this.active));
    } catch {
      this.status = "Device storage is full";
      this.lastError =
        "Your latest changes could not be saved on this device. Keep this tab open and connect to sync.";
    }
    if (emit) this.emit();
  }
  change(key, value, options = {}) {
    const baseRev = options.baseRev ?? this.data.fields[key]?.rev ?? 0;
    this.data.pending = this.data.pending.filter(
      (o) => o.key !== key || this.inflight.has(o.id),
    );
    this.data.pending.push({
      id: operationId(),
      key,
      value,
      baseRev,
      at: new Date().toISOString(),
    });
    if (!this.profile) {
      const o = this.data.pending.pop();
      this.data.fields[key] = { value: o.value, rev: 0, at: o.at };
      this.status = "On this device";
    } else this.status = "Saving…";
    this.persist();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), 700);
  }
  async apiCall(action, body, auth = true) {
    const u = new URL(this.api, location.href);
    u.searchParams.set("action", action);
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (auth && this.profile) {
      headers["X-Profile"] = this.profile;
      headers.Authorization = `Bearer ${this.data.code}`;
    }
    let r;
    try {
      r = await fetch(u, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(18000),
      });
    } catch {
      throw new Error(
        "Sync is unavailable. Your changes are kept on this device.",
      );
    }
    let d;
    try {
      d = await r.json();
    } catch {
      throw new Error(
        "The sync server is not connected. Your changes are kept on this device.",
      );
    }
    if (!r.ok) throw new Error(d.error || "Could not sync.");
    return d;
  }
  async create(name) {
    const guest = this.profile ? {} : this.fields;
    const d = await this.apiCall("create-profile", { username: name }, false);
    this.active = d.username;
    this.data = {
      ...empty(),
      fields: d.fields,
      profile: d.username,
      code: d.code,
    };
    for (const [key, f] of Object.entries(guest))
      this.data.pending.push({
        id: operationId(),
        key,
        value: f.value,
        baseRev: 0,
        at: f.at,
      });
    this.persist();
    await this.sync();
    return d.code;
  }
  async login(name, code) {
    const prev = this.data,
      active = this.active;
    this.data = {
      ...empty(),
      profile: name.trim().toLowerCase(),
      code: code.trim(),
    };
    try {
      const d = await this.apiCall("profile");
      const cached = read(PREFIX + d.username, empty());
      this.active = d.username;
      this.data = {
        ...cached,
        fields: d.fields,
        conflicts: d.conflicts,
        profile: d.username,
        code: code.trim(),
      };
      this.persist();
      await this.sync();
    } catch (e) {
      this.data = prev;
      this.active = active;
      throw e;
    }
  }
  logout() {
    if (this.busy)
      throw new Error("Wait a moment for the current save to finish.");
    this.active = "guest";
    this.data = read(PREFIX + "guest", empty());
    this.status = "On this device";
    this.lastError = "";
    this.persist();
  }
  async sync() {
    if (!this.profile || this.busy) return;
    this.busy = true;
    const profile = this.profile;
    const ops = this.data.pending.slice(0, 200);
    ops.forEach((o) => this.inflight.add(o.id));
    try {
      const previous = JSON.stringify([
        this.data.fields,
        this.data.conflicts,
        this.data.spotify,
        this.status,
      ]);
      const d = await this.apiCall(
        ops.length ? "sync" : "profile",
        ops.length ? { operations: ops } : undefined,
      );
      if (this.profile !== profile) return;
      const acknowledged = new Set(d.acknowledged || []),
        conflicted = new Set((d.conflicts || []).map((c) => c.id));
      this.data.pending = this.data.pending.filter(
        (o) => !acknowledged.has(o.id),
      );
      for (const o of this.data.pending) {
        if (
          ops.some(
            (sent) =>
              sent.key === o.key &&
              acknowledged.has(sent.id) &&
              !conflicted.has(sent.id),
          )
        )
          o.baseRev = d.fields[o.key]?.rev || 0;
      }
      this.data.fields = d.fields;
      this.data.conflicts = d.conflicts || [];
      this.data.spotify = d.spotify;
      this.status = this.data.pending.length ? "Saving…" : "Synced";
      this.lastError = "";
      this.persist(
        previous !==
          JSON.stringify([
            this.data.fields,
            this.data.conflicts,
            this.data.spotify,
            this.status,
          ]),
      );
    } catch (e) {
      this.status = "Waiting to sync";
      this.lastError = e.message;
      this.emit();
    } finally {
      ops.forEach((o) => this.inflight.delete(o.id));
      this.busy = false;
    }
  }
}
