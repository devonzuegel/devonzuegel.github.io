import {
  type Env,
  HttpError,
  now,
  random,
  hash,
  sourceKey,
  cookie,
  getCookie,
  json,
} from "./core.ts";
export async function session(req: Request, e: Env, mutate = false) {
  const token = getCookie(req, e, "session");
  if (!/^[\w-]{32}$/.test(token))
    throw new HttpError(401, "Sign in to continue.");
  const row = await e.DB.prepare(
    "SELECT token_hash,owner_id,csrf FROM sessions WHERE token_hash=? AND expires_at>?",
  )
    .bind(await hash(token), now())
    .first<{ token_hash: string; owner_id: string; csrf: string }>();
  if (!row || row.owner_id !== e.OWNER_GITHUB_ID)
    throw new HttpError(401, "Your session expired. Please sign in again.");
  if (
    mutate &&
    (req.headers.get("origin") !== e.DASHBOARD_ORIGIN ||
      req.headers.get("x-csrf-token") !== row.csrf)
  )
    throw new HttpError(
      403,
      "Request verification failed. Reload the dashboard.",
    );
  return row;
}
export async function auth(req: Request, e: Env, path: string) {
  if (path === "/auth/logout" && req.method === "POST") {
    const s = await session(req, e, true);
    await e.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
      .bind(s.token_hash)
      .run();
    const r = json({ ok: true });
    r.headers.set("Set-Cookie", cookie(e, "session", "", 0));
    return r;
  }
  if (req.method !== "GET") throw new HttpError(405, "Method not allowed.");
  if (!["/auth/login", "/auth/callback"].includes(path))
    throw new HttpError(404, "Not found.");
  const source = await sourceKey(req, e, now());
  if (
    !(await e.AUTH_LIMIT.limit({ key: source })).success ||
    !(await e.AUTH_LIMIT.limit({ key: "global" })).success
  )
    throw new HttpError(
      429,
      "Too many sign-in attempts. Please try again in a minute.",
    );
  if (
    !e.GITHUB_CLIENT_SECRET ||
    !e.GITHUB_CLIENT_ID ||
    e.GITHUB_CLIENT_ID.startsWith("REPLACE")
  )
    throw new HttpError(503, "Owner sign-in has not been configured yet.");
  const callback = `${e.PUBLIC_ORIGIN}/auth/callback`;
  if (path === "/auth/login") {
    const state = random(),
      browser = random(),
      verifier = random(32);
    await e.DB.prepare(
      "INSERT INTO oauth_flows(state_hash,browser_hash,verifier,expires_at) VALUES(?,?,?,?)",
    )
      .bind(await hash(state), await hash(browser), verifier, now() + 600)
      .run();
    const u = new URL("https://github.com/login/oauth/authorize");
    u.search = new URLSearchParams({
      client_id: e.GITHUB_CLIENT_ID,
      redirect_uri: callback,
      state,
      code_challenge: await hash(verifier),
      code_challenge_method: "S256",
      scope: "",
      allow_signup: "false",
    }).toString();
    return new Response(null, {
      status: 302,
      headers: {
        Location: u.href,
        "Set-Cookie": cookie(e, "oauth", browser, 600),
      },
    });
  }
  const url = new URL(req.url),
    state = url.searchParams.get("state") || "",
    code = url.searchParams.get("code") || "",
    browser = getCookie(req, e, "oauth");
  if (
    !/^[\w-]{32}$/.test(state) ||
    !/^[\w-]{32}$/.test(browser) ||
    !code ||
    code.length > 512
  )
    throw new HttpError(
      400,
      "Sign-in could not be verified. Start again from the dashboard.",
    );
  const flow = await e.DB.prepare(
    "DELETE FROM oauth_flows WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING verifier",
  )
    .bind(await hash(state), await hash(browser), now())
    .first<{ verifier: string }>();
  if (!flow)
    throw new HttpError(
      400,
      "Sign-in expired or was already used. Start again.",
    );
  const tr = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: e.GITHUB_CLIENT_ID,
      client_secret: e.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callback,
      code_verifier: flow.verifier,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!tr.ok)
    throw new HttpError(502, "GitHub sign-in is temporarily unavailable.");
  const token = (await tr.json()) as { access_token?: string };
  if (!token.access_token)
    throw new HttpError(400, "GitHub did not authorize this login.");
  const ur = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "devon-qr-codes",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!ur.ok) throw new HttpError(502, "GitHub identity verification failed.");
  const user = (await ur.json()) as { id?: number };
  // Provider token is only used in this request; it is never persisted or returned.
  if (String(user.id) !== e.OWNER_GITHUB_ID)
    throw new HttpError(403, "This dashboard is available only to its owner.");
  const sessionToken = random(),
    csrf = random();
  const old = getCookie(req, e, "session");
  await e.DB.batch([
    e.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(
      await hash(old),
    ),
    e.DB.prepare(
      "INSERT INTO sessions(token_hash,owner_id,csrf,expires_at) VALUES(?,?,?,?)",
    ).bind(await hash(sessionToken), e.OWNER_GITHUB_ID, csrf, now() + 604800),
  ]);
  const r = new Response(null, {
    status: 302,
    headers: { Location: `${e.DASHBOARD_ORIGIN}/QR-codes/` },
  });
  r.headers.append("Set-Cookie", cookie(e, "session", sessionToken, 604800));
  r.headers.append("Set-Cookie", cookie(e, "oauth", "", 0));
  return r;
}
