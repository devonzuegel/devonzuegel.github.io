// Sync & merge tests for Boggle Trainer
//
// Two suites:
//   1. Unit tests for mergeData logic (no network)
//   2. Integration tests for two-way sync via live API
//
// Usage:
//   node boggle/sync.test.js                        # unit tests only
//   ADMIN_SECRET=xxx node boggle/sync.test.js       # unit + integration tests

const API = "https://boggle-api.vercel.app/api";
const SECRET = process.env.ADMIN_SECRET;
const TEST_USER = "sync-test-" + Date.now(); // throwaway user, cleaned up at end

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "assertion failed");
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ── Pure mergeData (mirrors index.html logic, adapted as a pure function) ─────

function makeData(overrides) {
  return Object.assign(
    { sessions: [], queue: [], vocab: [], defs: {}, players: [], events: [],
      location: null, scoring: { zero3: false, zero4: false } },
    overrides
  );
}

function mergeData(local, remote) {
  // sessions: union by id, newest 200
  var seenId = {};
  local.sessions.forEach(function(s){ seenId[s.id] = true; });
  (remote.sessions || []).forEach(function(s){ if (!seenId[s.id]) local.sessions.push(s); });
  local.sessions.sort(function(a, b){ return b.ts - a.ts; });
  local.sessions = local.sessions.slice(0, 200);

  // vocab: union by word, merge learned flag
  var seenW = {};
  local.vocab.forEach(function(v){ seenW[v.word] = v; });
  (remote.vocab || []).forEach(function(v){
    if (!seenW[v.word]) local.vocab.push(v);
    else seenW[v.word].learned = seenW[v.word].learned || v.learned;
  });

  // defs: merge objects
  var rd = remote.defs || {};
  for (var w in rd) { if (!local.defs[w]) local.defs[w] = rd[w]; }

  // players: union
  (remote.players || []).forEach(function(n){ if (local.players.indexOf(n) < 0) local.players.push(n); });

  // events: union by ts+type
  var seenEv = {};
  (local.events || []).forEach(function(e){ seenEv[e.type + ":" + e.ts] = true; });
  (remote.events || []).forEach(function(e){
    if (!seenEv[e.type + ":" + e.ts]) { if (!local.events) local.events = []; local.events.push(e); }
  });
  if (local.events) local.events.sort(function(a, b){ return b.ts - a.ts; });

  // location: keep whichever exists
  if (!local.location && remote.location) local.location = remote.location;

  // queue: keep local unless empty
  if (!local.queue.length && remote.queue) local.queue = remote.queue;

  // scoring: take remote if local is still default
  if (remote.scoring && !local.scoring.zero3 && !local.scoring.zero4) local.scoring = remote.scoring;

  return local;
}

function session(id, ts) {
  return { id: id, ts: ts, board: [], found: [], seconds: 180, score: 0, pct: 0,
           found5: 0, total5: 0, replay: false, prevPct: null, early: false, left: 0 };
}

// ── Unit tests ─────────────────────────────────────────────────────────────────

async function runUnitTests() {
  console.log("\n── mergeData: sessions ─────────────────────────────");

  await test("local-only sessions are preserved", async () => {
    var local = makeData({ sessions: [session("A", 1000)] });
    var result = mergeData(local, makeData());
    assertEqual(result.sessions.length, 1);
    assertEqual(result.sessions[0].id, "A");
  });

  await test("server-only sessions are pulled in", async () => {
    var local = makeData();
    var remote = makeData({ sessions: [session("B", 1000)] });
    var result = mergeData(local, remote);
    assertEqual(result.sessions.length, 1);
    assertEqual(result.sessions[0].id, "B");
  });

  await test("sessions from both sides are unioned", async () => {
    var local = makeData({ sessions: [session("A", 2000)] });
    var remote = makeData({ sessions: [session("B", 1000)] });
    var result = mergeData(local, remote);
    assertEqual(result.sessions.length, 2);
  });

  await test("duplicate sessions (same id) are deduplicated", async () => {
    var local = makeData({ sessions: [session("A", 1000)] });
    var remote = makeData({ sessions: [session("A", 1000)] });
    var result = mergeData(local, remote);
    assertEqual(result.sessions.length, 1);
  });

  await test("sessions are sorted newest-first after merge", async () => {
    var local = makeData({ sessions: [session("old", 1000)] });
    var remote = makeData({ sessions: [session("new", 9000)] });
    var result = mergeData(local, remote);
    assertEqual(result.sessions[0].id, "new");
    assertEqual(result.sessions[1].id, "old");
  });

  await test("merge caps at 200 sessions", async () => {
    var localSessions = [];
    for (var i = 0; i < 150; i++) localSessions.push(session("L" + i, i));
    var remoteSessions = [];
    for (var j = 0; j < 100; j++) remoteSessions.push(session("R" + j, j + 1000));
    var result = mergeData(makeData({ sessions: localSessions }), makeData({ sessions: remoteSessions }));
    assert(result.sessions.length <= 200, "expected <=200 sessions, got " + result.sessions.length);
  });

  console.log("\n── mergeData: vocab ────────────────────────────────");

  await test("local vocab is preserved", async () => {
    var local = makeData({ vocab: [{ word: "hello", ts: 1, learned: false }] });
    var result = mergeData(local, makeData());
    assertEqual(result.vocab.length, 1);
  });

  await test("server vocab is pulled in", async () => {
    var remote = makeData({ vocab: [{ word: "world", ts: 1, learned: false }] });
    var result = mergeData(makeData(), remote);
    assertEqual(result.vocab.length, 1);
    assertEqual(result.vocab[0].word, "world");
  });

  await test("vocab is deduplicated by word", async () => {
    var local = makeData({ vocab: [{ word: "foo", ts: 1, learned: false }] });
    var remote = makeData({ vocab: [{ word: "foo", ts: 1, learned: false }] });
    var result = mergeData(local, remote);
    assertEqual(result.vocab.length, 1);
  });

  await test("learned flag is OR'd: false+true → true", async () => {
    var local = makeData({ vocab: [{ word: "foo", ts: 1, learned: false }] });
    var remote = makeData({ vocab: [{ word: "foo", ts: 1, learned: true }] });
    var result = mergeData(local, remote);
    assertEqual(result.vocab[0].learned, true);
  });

  await test("learned flag is OR'd: true+false → true", async () => {
    var local = makeData({ vocab: [{ word: "foo", ts: 1, learned: true }] });
    var remote = makeData({ vocab: [{ word: "foo", ts: 1, learned: false }] });
    var result = mergeData(local, remote);
    assertEqual(result.vocab[0].learned, true);
  });

  console.log("\n── mergeData: misc fields ──────────────────────────");

  await test("players are unioned", async () => {
    var local = makeData({ players: ["Alice"] });
    var remote = makeData({ players: ["Bob"] });
    var result = mergeData(local, remote);
    assert(result.players.includes("Alice") && result.players.includes("Bob"));
  });

  await test("duplicate players are not added twice", async () => {
    var local = makeData({ players: ["Alice"] });
    var remote = makeData({ players: ["Alice"] });
    var result = mergeData(local, remote);
    assertEqual(result.players.filter(function(p){ return p === "Alice"; }).length, 1);
  });

  await test("remote location fills empty local location", async () => {
    var remote = makeData({ location: { city: "Miami Beach" } });
    var result = mergeData(makeData(), remote);
    assertEqual(result.location.city, "Miami Beach");
  });

  await test("local location is not overwritten by remote", async () => {
    var local = makeData({ location: { city: "Portland" } });
    var remote = makeData({ location: { city: "Miami Beach" } });
    var result = mergeData(local, remote);
    assertEqual(result.location.city, "Portland");
  });

  await test("remote queue fills empty local queue", async () => {
    var q = [{ boardKey: "ABC", due: 9999 }];
    var remote = makeData({ queue: q });
    var result = mergeData(makeData(), remote);
    assertEqual(result.queue.length, 1);
  });

  await test("local queue is preserved when non-empty", async () => {
    var local = makeData({ queue: [{ boardKey: "LOCAL", due: 1 }] });
    var remote = makeData({ queue: [{ boardKey: "REMOTE", due: 2 }] });
    var result = mergeData(local, remote);
    assertEqual(result.queue[0].boardKey, "LOCAL");
  });

  await test("remote non-default scoring is adopted", async () => {
    var remote = makeData({ scoring: { zero3: true, zero4: false } });
    var result = mergeData(makeData(), remote);
    assertEqual(result.scoring.zero3, true);
  });

  await test("local non-default scoring is not overwritten", async () => {
    var local = makeData({ scoring: { zero3: false, zero4: true } });
    var remote = makeData({ scoring: { zero3: true, zero4: false } });
    var result = mergeData(local, remote);
    assertEqual(result.scoring.zero4, true);
    assertEqual(result.scoring.zero3, false);
  });

  await test("defs from remote are merged in", async () => {
    var remote = makeData({ defs: { foo: [{ pos: "noun", defs: ["a thing"] }] } });
    var result = mergeData(makeData(), remote);
    assert(result.defs.foo, "expected foo def");
  });

  await test("existing local defs are not overwritten", async () => {
    var local = makeData({ defs: { foo: [{ pos: "noun", defs: ["local def"] }] } });
    var remote = makeData({ defs: { foo: [{ pos: "noun", defs: ["remote def"] }] } });
    var result = mergeData(local, remote);
    assertEqual(result.defs.foo[0].defs[0], "local def");
  });

  console.log("\n── mergeData: the wipe bug scenario ───────────────");

  await test("merging empty local into rich remote recovers all sessions", async () => {
    var local = makeData(); // empty — simulates new device before syncDown
    var remote = makeData({
      sessions: [session("S1", 3000), session("S2", 2000), session("S3", 1000)],
      player: "Devon"
    });
    var result = mergeData(local, remote);
    assertEqual(result.sessions.length, 3, "all 3 remote sessions should appear");
  });

  await test("merging rich local into empty remote preserves all sessions", async () => {
    // simulates pushing after local has data server lost
    var local = makeData({
      sessions: [session("A", 3000), session("B", 2000)]
    });
    var result = mergeData(local, makeData());
    assertEqual(result.sessions.length, 2, "local sessions should be retained");
  });

  await test("bidirectional merge: each side has unique sessions, result has all", async () => {
    var local = makeData({ sessions: [session("local-1", 5000), session("local-2", 4000)] });
    var remote = makeData({ sessions: [session("remote-1", 3000), session("remote-2", 2000)] });
    var result = mergeData(local, remote);
    assertEqual(result.sessions.length, 4, "should have all 4 sessions");
    var ids = result.sessions.map(function(s){ return s.id; });
    assert(ids.includes("local-1") && ids.includes("local-2") && ids.includes("remote-1") && ids.includes("remote-2"));
  });
}

// ── Integration tests ──────────────────────────────────────────────────────────

async function apiPost(user, body, token) {
  var headers = { "Content-Type": "application/json" };
  if (token) headers["X-Admin-Token"] = token;
  var r = await fetch(`${API}/boggle?user=${encodeURIComponent(user)}`, {
    method: "POST", headers: headers, body: JSON.stringify(body)
  });
  return r;
}

async function apiGet(user, token) {
  var headers = {};
  if (token) headers["X-Admin-Token"] = token;
  var r = await fetch(`${API}/boggle?user=${encodeURIComponent(user)}`, { headers });
  if (!r.ok) throw new Error("GET failed: " + r.status);
  return r.json();
}

async function apiDelete(user) {
  var r = await fetch(`${API}/admin?action=delete_player&user=${encodeURIComponent(user)}`, {
    method: "POST", headers: { "X-Admin-Token": SECRET }
  });
  if (!r.ok) throw new Error("delete failed: " + r.status);
}

async function runIntegrationTests() {
  console.log("\n── Integration: two-way sync ────────────────────────");

  const user = TEST_USER;

  await test("setup: can write initial state to server", async () => {
    var body = makeData({
      player: user,
      sessions: [session("server-only-1", 2000), session("server-only-2", 1000)]
    });
    var r = await apiPost(user, body);
    assert(r.status === 200, "expected 200, got " + r.status);
  });

  await test("syncDown: pulls server sessions into empty local", async () => {
    // simulate: local is empty (new device), syncDown merges remote
    var local = makeData();
    var remote = await apiGet(user);
    var result = mergeData(local, remote);
    assertEqual(result.sessions.length, 2, "should have pulled 2 server sessions");
    var ids = result.sessions.map(function(s){ return s.id; });
    assert(ids.includes("server-only-1") && ids.includes("server-only-2"));
  });

  await test("syncUp after syncDown: merged state is pushed back", async () => {
    // simulate: local has 1 extra session not on server
    var local = makeData({ sessions: [session("local-only-1", 5000)] });
    var remote = await apiGet(user);
    var merged = mergeData(local, remote);

    // push merged result (simulates what Sync Now does)
    var r = await apiPost(user, merged);
    assert(r.status === 200, "push should succeed");

    // verify server now has all 3 sessions
    var serverState = await apiGet(user);
    assertEqual(serverState.sessions.length, 3, "server should have all 3 sessions after push");
    var ids = serverState.sessions.map(function(s){ return s.id; });
    assert(ids.includes("local-only-1"), "local-only session should be on server");
    assert(ids.includes("server-only-1"), "server session 1 should still be there");
    assert(ids.includes("server-only-2"), "server session 2 should still be there");
  });

  await test("Sync Now does not lose sessions that exist only on server", async () => {
    // Reset server to known state with 2 sessions
    var serverState = makeData({
      player: user,
      sessions: [session("srv-A", 9000), session("srv-B", 8000)]
    });
    await apiPost(user, serverState);

    // Local has a different session (e.g. played offline)
    var local = makeData({ sessions: [session("local-C", 7000)] });

    // Sync Now: syncDown then syncUp
    var remote = await apiGet(user);
    var merged = mergeData(local, remote);
    await apiPost(user, merged);

    var final = await apiGet(user);
    assertEqual(final.sessions.length, 3, "all sessions should survive Sync Now");
    var ids = final.sessions.map(function(s){ return s.id; });
    assert(ids.includes("srv-A") && ids.includes("srv-B") && ids.includes("local-C"));
  });

  await test("Sync Now is idempotent: running it twice doesn't duplicate sessions", async () => {
    var state = await apiGet(user);

    // run Sync Now twice
    var m1 = mergeData(JSON.parse(JSON.stringify(state)), state);
    await apiPost(user, m1);
    var m2 = mergeData(JSON.parse(JSON.stringify(m1)), await apiGet(user));
    await apiPost(user, m2);

    var final = await apiGet(user);
    assertEqual(final.sessions.length, 3, "no duplicates after running Sync Now twice");
  });

  await test("cleanup: delete test user", async () => {
    await apiDelete(user);
    // confirm gone (GET should return empty object)
    var r = await fetch(`${API}/boggle?user=${encodeURIComponent(user)}`);
    var body = await r.json();
    assert(!body.sessions || body.sessions.length === 0, "test user should be deleted");
  });
}

// ── Runner ─────────────────────────────────────────────────────────────────────

async function run() {
  await runUnitTests();

  if (SECRET) {
    await runIntegrationTests();
  } else {
    console.log("\n  (skipping integration tests — set ADMIN_SECRET to run them)");
  }

  console.log(`\n${"─".repeat(52)}`);
  console.log(`  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(function(e){ console.error(e); process.exit(1); });
