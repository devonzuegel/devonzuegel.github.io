// Integration tests for boggle API auth
// Usage: ADMIN_SECRET=<your_secret> node boggle/api.test.js

const API = "https://boggle-api.vercel.app/api";
const SECRET = process.env.ADMIN_SECRET;

if (!SECRET) {
  console.error("ERROR: ADMIN_SECRET env var required. Run as: ADMIN_SECRET=xxx node boggle/api.test.js");
  process.exit(1);
}

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
  if (!condition) throw new Error(msg);
}

async function run() {
  console.log("\n── Devon account: GET ──────────────────────────────");

  await test("GET Devon without token → 403", async () => {
    const r = await fetch(`${API}/boggle?user=Devon`);
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("GET Devon with wrong token → 403", async () => {
    const r = await fetch(`${API}/boggle?user=Devon`, {
      headers: { "X-Admin-Token": "wrongpassword" }
    });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("GET Devon with correct token → 200", async () => {
    const r = await fetch(`${API}/boggle?user=Devon`, {
      headers: { "X-Admin-Token": SECRET }
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
  });

  await test("GET devon (lowercase) without token → 403", async () => {
    const r = await fetch(`${API}/boggle?user=devon`);
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("GET DEVON (uppercase) without token → 403", async () => {
    const r = await fetch(`${API}/boggle?user=DEVON`);
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  console.log("\n── Devon account: POST ─────────────────────────────");

  await test("POST Devon without token → 403", async () => {
    const r = await fetch(`${API}/boggle?user=Devon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessions: [], player: "Devon" })
    });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("POST Devon with wrong token → 403", async () => {
    const r = await fetch(`${API}/boggle?user=Devon`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": "wrongpassword" },
      body: JSON.stringify({ sessions: [], player: "Devon" })
    });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("POST Devon with correct token → 200", async () => {
    const r = await fetch(`${API}/boggle?user=Devon`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": SECRET },
      body: JSON.stringify({ sessions: [], player: "Devon" })
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    const body = await r.json();
    assert(body.ok === true, `expected {ok:true}, got ${JSON.stringify(body)}`);
  });

  await test("POST devon (lowercase) without token → 403", async () => {
    const r = await fetch(`${API}/boggle?user=devon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessions: [] })
    });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  console.log("\n── Other users: freely readable/writable ───────────");

  await test("GET Alice without token → 200", async () => {
    const r = await fetch(`${API}/boggle?user=Alice`);
    assert(r.status === 200, `expected 200, got ${r.status}`);
  });

  await test("POST Alice without token → 200", async () => {
    const r = await fetch(`${API}/boggle?user=Alice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessions: [], player: "Alice" })
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
    const body = await r.json();
    assert(body.ok === true, `expected {ok:true}, got ${JSON.stringify(body)}`);
  });

  await test("GET Bob without token → 200", async () => {
    const r = await fetch(`${API}/boggle?user=Bob`);
    assert(r.status === 200, `expected 200, got ${r.status}`);
  });

  console.log("\n── Admin API: fully locked down ────────────────────");

  await test("GET /admin?action=list without token → 403", async () => {
    const r = await fetch(`${API}/admin?action=list`);
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("GET /admin?action=list with wrong token → 403", async () => {
    const r = await fetch(`${API}/admin?action=list`, {
      headers: { "X-Admin-Token": "wrongpassword" }
    });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("GET /admin?action=list with correct token → 200", async () => {
    const r = await fetch(`${API}/admin?action=list`, {
      headers: { "X-Admin-Token": SECRET }
    });
    assert(r.status === 200, `expected 200, got ${r.status}`);
  });

  await test("POST /admin?action=delete_all without token → 403", async () => {
    const r = await fetch(`${API}/admin?action=delete_all`, { method: "POST" });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("POST /admin?action=delete_all with wrong token → 403", async () => {
    const r = await fetch(`${API}/admin?action=delete_all`, {
      method: "POST",
      headers: { "X-Admin-Token": "wrongpassword" }
    });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("POST /admin?action=delete_player without token → 403", async () => {
    const r = await fetch(`${API}/admin?action=delete_player&user=Alice`, { method: "POST" });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("POST /admin?action=delete_player with wrong token → 403", async () => {
    const r = await fetch(`${API}/admin?action=delete_player&user=Alice`, {
      method: "POST",
      headers: { "X-Admin-Token": "wrongpassword" }
    });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("POST /admin?action=delete_session without token → 403", async () => {
    const r = await fetch(`${API}/admin?action=delete_session&user=Alice&id=123`, { method: "POST" });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test("POST /admin?action=delete_session with wrong token → 403", async () => {
    const r = await fetch(`${API}/admin?action=delete_session&user=Alice&id=123`, {
      method: "POST",
      headers: { "X-Admin-Token": "wrongpassword" }
    });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  console.log(`\n${"─".repeat(52)}`);
  console.log(`  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
