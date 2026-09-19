import { randomBytes } from "node:crypto";
import * as store from "./storage.mjs";
import { json, request } from "./network.mjs";
import { normalize } from "../shared/core.js";
export const spotifyConfigured = () =>
  !!(
    process.env.SPOTIFY_CLIENT_ID &&
    process.env.SPOTIFY_CLIENT_SECRET &&
    process.env.SPOTIFY_REDIRECT_URI
  );
async function tokenRequest(params) {
  const r = await request("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID +
            ":" +
            process.env.SPOTIFY_CLIENT_SECRET,
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  return r.json();
}
export async function startSpotify(name) {
  if (!spotifyConfigured())
    throw Object.assign(
      new Error(
        "Spotify API access is not configured. You can import your listening-history files instead.",
      ),
      { status: 503 },
    );
  const state = randomBytes(24).toString("base64url");
  await store.set("oauth:" + state, { name, expires: Date.now() + 600000 });
  const u = new URL("https://accounts.spotify.com/authorize");
  Object.entries({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: "user-top-read user-read-recently-played",
    state,
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.href;
}
export async function finishSpotify(state, code) {
  if (!/^[\w-]{32}$/.test(state || ""))
    throw new Error("Invalid Spotify connection.");
  let session;
  await store.update("oauth:" + state, (old) => {
    if (!old || old.expires < Date.now() || old.used)
      throw new Error("Spotify connection expired. Please try again.");
    session = old;
    return { ...old, used: true };
  });
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
  });
  await store.update("profile:" + session.name, (p) => ({
    ...p,
    spotify: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expires: Date.now() + tokens.expires_in * 1000,
    },
  }));
  await refreshSpotify(session.name);
  return session.name;
}
export async function refreshSpotify(name) {
  let p = await store.get("profile:" + name);
  if (!p?.spotify) throw new Error("Connect Spotify first.");
  let credentials = p.spotify;
  if (credentials.expires < Date.now() + 60000) {
    const t = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
    });
    credentials = {
      ...credentials,
      accessToken: t.access_token,
      refreshToken: t.refresh_token || credentials.refreshToken,
      expires: Date.now() + t.expires_in * 1000,
    };
    await store.update("profile:" + name, (p) => ({
      ...p,
      spotify: credentials,
    }));
  }
  const headers = { Authorization: `Bearer ${credentials.accessToken}` };
  const results = await Promise.allSettled([
    json(
      "https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=50",
      { headers },
    ),
    json(
      "https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=50",
      { headers },
    ),
    json("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
      headers,
    }),
  ]);
  if (results.every((r) => r.status === "rejected"))
    throw new Error(
      "Spotify could not read this account. Check Premium and the app allowlist, or import listening history.",
    );
  const listening = {};
  for (let i = 0; i < 2; i++) {
    if (results[i].status !== "fulfilled") continue;
    results[i].value.items.forEach((a, index) => {
      const item = {
        name: a.name,
        id: a.id,
        score: 50 - index + (i === 0 ? 50 : 0),
        reason: "One of your top artists",
        source: "spotify",
      };
      if (!listening[a.id] || listening[a.id].score < item.score)
        listening[a.id] = listening[normalize(a.name)] = item;
    });
  }
  if (results[2].status === "fulfilled")
    for (const item of results[2].value.items || [])
      for (const a of item.track?.artists || []) {
        if (!listening[a.id])
          listening[a.id] = listening[normalize(a.name)] = {
            name: a.name,
            id: a.id,
            score: 1,
            reason: "Recently played",
            source: "spotify",
          };
      }
  await store.update("profile:" + name, (p) => {
    p.revision++;
    p.fields.listening = {
      value: listening,
      rev: p.revision,
      at: new Date().toISOString(),
    };
    p.spotify.updatedAt = new Date().toISOString();
    return p;
  });
  return listening;
}
export async function disconnectSpotify(name) {
  await store.update("profile:" + name, (p) => {
    delete p.spotify;
    p.revision++;
    p.fields.listening = {
      value: null,
      rev: p.revision,
      at: new Date().toISOString(),
    };
    return p;
  });
}
