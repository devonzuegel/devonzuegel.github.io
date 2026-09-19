import { readFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import { parseVenue, makeEvent, clean } from "./parsers.mjs";
import { request, json, responseText } from "./network.mjs";
import * as store from "./storage.mjs";
import {
  DEFAULT_CITIES,
  mergeEvents,
  dayInZone,
  addDays,
  inMetro,
} from "../shared/core.js";
export const venues = JSON.parse(
  await readFile(new URL("../data/venues.json", import.meta.url), "utf8"),
);
const SNAPSHOT = new URL("../data/events.json", import.meta.url);
export async function bundledFeed() {
  try {
    return JSON.parse(await readFile(SNAPSHOT, "utf8"));
  } catch {
    return { events: [], sources: [], updatedAt: null, coverage: "partial" };
  }
}
const robotsCache = new Map();
async function allowed(url) {
  const u = new URL(url);
  let text = robotsCache.get(u.origin);
  if (text === undefined) {
    try {
      const r = await fetch(u.origin + "/robots.txt", {
        signal: AbortSignal.timeout(5000),
      });
      text = r.ok ? await r.text() : "";
    } catch {
      text = "";
    }
    robotsCache.set(u.origin, text);
  }
  let active = false;
  for (const line of text.split("\n")) {
    const l = line.replace(/#.*/, "").trim();
    if (/^User-agent:/i.test(l)) active = /^User-agent:\s*\*$/i.test(l);
    if (active && /^Disallow:/i.test(l)) {
      const rule = l.replace(/^Disallow:\s*/i, "").trim();
      if (
        rule === "/" ||
        (rule && !rule.includes("*") && u.pathname.startsWith(rule))
      )
        return false;
    }
  }
  return true;
}
export async function readVenue(v, now = new Date()) {
  const visited = new Set();
  if (!(await allowed(v.url)))
    throw new Error("Automated access is restricted by this source.");
  let url =
    v.parser === "tribe"
      ? new URL("/wp-json/tribe/events/v1/events?per_page=100", v.url).href
      : v.url;
  const events = [];
  let pages = 0,
    hasMore = false;
  do {
    if (visited.has(url)) break;
    visited.add(url);
    if (!(await allowed(url)))
      throw new Error("Automated access is restricted by this source.");
    const r = await request(url);
    const html = await responseText(r);
    const parsed = parseVenue(v, html, now);
    events.push(...parsed);
    pages++;
    if (v.parser === "tribe") {
      const d = JSON.parse(html);
      url = d.next_rest_url || null;
    } else {
      const $ = cheerio.load(html);
      let next = $('a.next.page-numbers,a.nextpostslink,a[rel="next"]')
        .first()
        .attr("href");
      if (!next)
        next = $("a")
          .filter((i, e) => /^Next\s*[»›→]?$/i.test(clean($(e).text())))
          .first()
          .attr("href");
      url = next ? new URL(next, r.url).href : null;
    }
    if (url && new URL(url).hostname !== new URL(v.url).hostname) url = null;
    hasMore = !!url;
  } while (url && pages < 8);
  return {
    events: [...new Map(events.map((e) => [e.id, e])).values()],
    pages,
    hasMore,
  };
}
export async function refreshFeed({ now = new Date(), concurrency = 3 } = {}) {
  const prior = await getFeed();
  const outputs = new Array(venues.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < venues.length) {
        const index = cursor++,
          v = venues[index];
        try {
          const { events, pages, hasMore } = await readVenue(v, now);
          if (
            !events.length &&
            prior.events.some(
              (e) =>
                (e.sourceId || e.venue?.id) === v.id &&
                e.date >= dayInZone(now, v.timezone),
            )
          )
            throw new Error(
              "Calendar returned no readable events; keeping previously retrieved listings.",
            );
          const current = events.filter(
            (e) => e.date >= dayInZone(now, v.timezone),
          );
          outputs[index] = {
            events: current,
            source: {
              id: v.id,
              name: v.name,
              metro: v.metro,
              url: v.url,
              status: current.length ? "ok" : "empty",
              count: current.length,
              pages,
              partial: hasMore,
              checkedAt: now.toISOString(),
              message: current.length
                ? hasMore
                  ? "Additional source pages may exist."
                  : "Official calendar. Coverage limited to published listings."
                : "No upcoming concerts could be read from this calendar.",
            },
          };
        } catch (error) {
          const old = prior.events.filter(
            (e) =>
              (e.sourceId || e.venue?.id) === v.id &&
              e.date >= dayInZone(now, v.timezone),
          );
          outputs[index] = {
            events: old,
            source: {
              id: v.id,
              name: v.name,
              metro: v.metro,
              url: v.url,
              status: "error",
              count: old.length,
              checkedAt: now.toISOString(),
              message: error.message,
            },
          };
        }
      }
    }),
  );
  const feed = {
    events: mergeEvents(outputs.flatMap((o) => o.events)),
    sources: outputs.map((o) => o.source),
    updatedAt: now.toISOString(),
    coverage: "partial",
    notice:
      "Official venue calendars. Coverage is incomplete; open Sources to see included venues and gaps.",
  };
  if (store.storageMode !== "unconfigured") await store.set("feed", feed);
  return feed;
}
export async function getFeed() {
  const bundled = await bundledFeed();
  try {
    const cached = await store.get("feed");
    return cached && cached.updatedAt > bundled.updatedAt ? cached : bundled;
  } catch {
    return bundled;
  }
}
export async function ticketmaster(cities, from, to) {
  if (!process.env.TICKETMASTER_API_KEY)
    return { events: [], configured: false };
  const cacheKey = `tm:${cities
    .map((c) => [c.id, c.lat, c.lng, c.radius].join(":"))
    .sort()
    .join(",")}:${from}:${to}`;
  const cached = await store.get(cacheKey);
  if (cached && Date.now() - cached.at < 6 * 3600000) return cached.value;
  const events = [];
  let requests = 0,
    lastRequest = 0;
  const key = process.env.TICKETMASTER_API_KEY;
  async function window(city, start, end) {
    const base = new URL(
      "https://app.ticketmaster.com/discovery/v2/events.json",
    );
    Object.entries({
      apikey: key,
      classificationName: "music",
      latlong: `${city.lat},${city.lng}`,
      radius: city.radius,
      unit: "miles",
      startDateTime: start + "T00:00:00Z",
      endDateTime: end + "T23:59:59Z",
      size: 200,
      sort: "date,asc",
    }).forEach(([k, v]) => base.searchParams.set(k, v));
    const pages = [];
    let d;
    for (let page = 0; page < 5; page++) {
      if (++requests > 80)
        throw new Error(
          "This date range is too large to fetch at once. Try a shorter range.",
        );
      base.searchParams.set("page", page);
      await new Promise((r) =>
        setTimeout(r, Math.max(0, 220 - (Date.now() - lastRequest))),
      );
      lastRequest = Date.now();
      d = await json(base);
      if (page === 0 && d.page?.totalElements >= 1000 && start !== end) {
        const mid = addDays(
          start,
          Math.floor((Date.parse(end) - Date.parse(start)) / 86400000 / 2),
        );
        await window(city, start, mid);
        await window(city, addDays(mid, 1), end);
        return;
      }
      pages.push(...(d._embedded?.events || []));
      if (page + 1 >= (d.page?.totalPages || 0)) break;
    }
    if (d.page?.totalElements >= 1000 && start === end)
      throw new Error(
        "This day exceeds the source paging limit; coverage is partial.",
      );
    for (const e of pages) {
      const v = e._embedded?.venues?.[0];
      if (!v) continue;
      const known = venues.find(
        (x) => x.name.toLowerCase() === v.name?.toLowerCase(),
      );
      const venue = {
        ...known,
        id: known?.id || "tm-" + v.id,
        name: v.name,
        metro: city.id,
        timezone:
          v.timezone ||
          e.dates?.timezone ||
          city.timezone ||
          "America/New_York",
        lat: Number(v.location?.latitude),
        lng: Number(v.location?.longitude),
        address: [v.address?.line1, v.city?.name, v.state?.stateCode]
          .filter(Boolean)
          .join(", "),
        locality: v.city?.name,
        capacity: known?.capacity || null,
        url: v.url || e.url,
      };
      if (!inMetro(venue, city)) continue;
      const event = makeEvent(venue, {
        id: "tm-" + e.id,
        title: e.name,
        date: e.dates?.start?.localDate,
        time: e.dates?.start?.timeTBA
          ? null
          : e.dates?.start?.localTime?.slice(0, 5),
        startAt: e.dates?.start?.dateTime,
        url: e.url,
        image: e.images?.find((i) => i.ratio === "16_9")?.url,
        artists: e._embedded?.attractions?.map((a) => a.name),
        genres: e.classifications
          ?.map((c) => c.genre?.name)
          .filter((g) => g && g !== "Undefined"),
        status: e.dates?.status?.code,
      });
      if (event) {
        event.sources = [{ name: "Ticketmaster", url: e.url }];
        events.push(event);
      }
    }
  }
  for (const c of cities) await window(c, from, to);
  const value = { events: mergeEvents(events), configured: true };
  await store.set(cacheKey, { at: Date.now(), value });
  return value;
}
