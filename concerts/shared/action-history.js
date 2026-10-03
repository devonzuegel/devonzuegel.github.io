export class ActionHistory {
  constructor() {
    this.owner = null;
    this.entries = [];
  }
  scope(owner) {
    if (owner !== this.owner) {
      this.owner = owner;
      this.entries = [];
    }
  }
  record(owner, label, changes) {
    this.scope(owner);
    const changed = changes.filter((c) => !Object.is(c.before, c.after));
    if (!changed.length) return;
    this.entries.push({ label, changes: changed });
    if (this.entries.length > 100) this.entries.shift();
  }
  undo(owner, read, write) {
    this.scope(owner);
    const entry = this.entries.pop();
    if (!entry) return null;
    let applied = 0;
    for (const c of entry.changes) {
      if (!Object.is(read(c.key), c.after)) continue;
      if (c.guard && !Object.is(read(c.guard.key), c.guard.value)) continue;
      write(c.key, c.before);
      applied++;
    }
    return { label: entry.label, applied };
  }
}
