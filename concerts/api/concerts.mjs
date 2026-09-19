import {
  createProfile,
  authenticate,
  publicProfile,
  syncProfile,
} from "../server/profiles.mjs";
import { getFeed, ticketmaster } from "../server/feeds.mjs";
import { searchMedia } from "../server/media.mjs";
import {
  spotifyConfigured,
  startSpotify,
  finishSpotify,
  refreshSpotify,
  disconnectSpotify,
} from "../server/spotify.mjs";
import { storageMode } from "../server/storage.mjs";
import { json } from "../server/network.mjs";
import { DEFAULT_CITIES, mergeEvents } from "../shared/core.js";
const placeCache = new Map(),
  limits = new Map();
export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = (process.env.APP_ORIGIN || "https://devonzuegel.com")
    .split(",")
    .map((x) => x.trim());
  if (
    origin &&
    (allowed.includes(origin) ||
      (!process.env.VERCEL &&
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(
          origin,
        )))
  )
    res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Profile",
  );
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  const u = new URL(req.url, "http://localhost"),
    action = u.searchParams.get("action") || "status";
  function send(value, status = 200) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(value));
  }
  try {
    const changing = [
      "create-profile",
      "sync",
      "spotify-start",
      "spotify-refresh",
      "spotify-disconnect",
    ];
    if (changing.includes(action) && req.method !== "POST")
      return send({ error: "Use POST." }, 405);
    if (!["GET", "POST"].includes(req.method))
      return send({ error: "Method not allowed." }, 405);
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    if (req.method === "POST" && !body) {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 2500000)
          return send({ error: "Request is too large." }, 413);
      }
      body = raw ? JSON.parse(raw) : {};
    }
    body ||= {};
    if (action === "status")
      return send({
        ok: true,
        sync: storageMode !== "unconfigured",
        storage: storageMode,
        youtube: !!process.env.YOUTUBE_API_KEY,
        ticketmaster: !!process.env.TICKETMASTER_API_KEY,
        spotify: spotifyConfigured(),
      });
    if (action === "events") {
      const feed = await getFeed();
      let extra = { events: [], configured: false };
      let sourceError = null;
      if (process.env.TICKETMASTER_API_KEY) {
        const from = u.searchParams.get("from"),
          to = u.searchParams.get("to");
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(from || "") ||
          !/^\d{4}-\d{2}-\d{2}$/.test(to || "") ||
          to < from ||
          Date.parse(to) - Date.parse(from) > 367 * 86400000
        )
          return send(
            { error: "Choose a date range of one year or less." },
            400,
          );
        let cities = DEFAULT_CITIES.filter((c) =>
          (u.searchParams.get("cities") || "sf,miami,nyc")
            .split(",")
            .includes(c.id),
        );
        const custom = u.searchParams.get("custom");
        if (custom) {
          const added = JSON.parse(custom);
          if (!Array.isArray(added) || added.length > 5)
            throw new Error("Too many city searches.");
          for (const c of added) {
            if (
              !Number.isFinite(c.lat) ||
              Math.abs(c.lat) > 90 ||
              !Number.isFinite(c.lng) ||
              Math.abs(c.lng) > 180 ||
              !Number.isFinite(c.radius) ||
              c.radius < 1 ||
              c.radius > 200
            )
              throw new Error("Invalid city coordinates.");
            cities.push(c);
          }
        }
        try {
          extra = await ticketmaster(cities, from, to);
        } catch (e) {
          sourceError = e.message;
        }
      }
      return send({
        ...feed,
        events: mergeEvents([...feed.events, ...extra.events]),
        ticketmaster: extra.configured,
        sourceError,
      });
    }
    if (action === "media")
      return send(
        await searchMedia({
          artist: u.searchParams.get("artist"),
          mode: u.searchParams.get("mode") || "live",
          query: u.searchParams.get("q") || "",
          page: Number(u.searchParams.get("page")) || 1,
          pageToken: u.searchParams.get("pageToken") || "",
        }),
      );
    if (action === "places") {
      const q = String(u.searchParams.get("q") || "")
        .trim()
        .slice(0, 100);
      if (q.length < 2) return send({ places: [] });
      if (placeCache.has(q)) return send(placeCache.get(q));
      const r = await json(
        "https://geocoding-api.open-meteo.com/v1/search?" +
          new URLSearchParams({
            name: q,
            count: 8,
            language: "en",
            format: "json",
          }),
      );
      const result = {
        places: (r.results || []).map((p) => ({
          id: "place-" + p.id,
          name: p.name,
          region: [p.admin1, p.country].filter(Boolean).join(", "),
          lat: p.latitude,
          lng: p.longitude,
          timezone: p.timezone,
          radius: 40,
          short: p.name.slice(0, 3).toUpperCase(),
          color: "#7d8561",
          enabled: true,
        })),
      };
      placeCache.set(q, result);
      return send(result);
    }
    if (action === "create-profile") {
      const key =
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "local";
      const last = limits.get(key) || { at: Date.now(), count: 0 };
      if (Date.now() - last.at > 3600000) {
        last.at = Date.now();
        last.count = 0;
      }
      if (last.count++ > 30)
        return send({ error: "Too many new profiles. Please try later." }, 429);
      limits.set(key, last);
      return send(await createProfile(body.username), 201);
    }
    if (action === "spotify-callback") {
      let result = "connected";
      try {
        if (u.searchParams.has("error"))
          throw new Error("Connection declined.");
        await finishSpotify(
          u.searchParams.get("state"),
          u.searchParams.get("code"),
        );
      } catch {
        result = "error";
      }
      res.statusCode = 302;
      res.setHeader(
        "Location",
        (process.env.APP_ORIGIN?.split(",")[0] || "http://127.0.0.1:4317") +
          "/concerts/?spotify=" +
          result,
      );
      return res.end();
    }
    const name = req.headers["x-profile"],
      code = req.headers.authorization?.replace(/^Bearer /, "");
    const p = await authenticate(name, code);
    if (action === "profile") return send(publicProfile(p));
    if (action === "sync")
      return send(await syncProfile(name, code, body.operations || []));
    if (action === "spotify-start")
      return send({ url: await startSpotify(name) });
    if (action === "spotify-refresh") {
      await refreshSpotify(name);
      return send({ ok: true });
    }
    if (action === "spotify-disconnect") {
      await disconnectSpotify(name);
      return send({ ok: true });
    }
    return send({ error: "Unknown endpoint." }, 404);
  } catch (e) {
    send(
      { error: e.message || "Something went wrong." },
      e.status && e.status >= 400 && e.status < 600 ? e.status : 500,
    );
  }
}
