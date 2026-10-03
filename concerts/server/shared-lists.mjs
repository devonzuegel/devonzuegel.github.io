import { randomBytes } from "node:crypto";
import * as storage from "./storage.mjs";
const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const text = (v, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
const url = (v) => {
  try {
    const u = new URL(v);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
};
// Explicit allowlist: no assessments, profile credentials or listening data enter public storage.
export function publicConcert(e) {
  if (!e || !text(e.id, 200) || !text(e.title)) throw fail("Invalid concert.");
  for (const date of [e.date, e.endDate]) {
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))
    )
      throw fail("Invalid concert date.");
  }
  if (e.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time))
    throw fail("Invalid concert time.");
  return {
    id: text(e.id, 200),
    title: text(e.title),
    metro: text(e.metro, 80),
    artists: Array.isArray(e.artists)
      ? e.artists.slice(0, 200).map((a) => ({ name: text(a.name) }))
      : [{ name: text(e.title) }],
    sources: Array.isArray(e.sources)
      ? e.sources
          .slice(0, 10)
          .map((s) => ({ name: text(s.name), url: url(s.url) }))
      : [],
    date: text(e.date, 10),
    endDate: text(e.endDate, 10),
    time: text(e.time, 30),
    timeKind: e.timeKind === "doors" ? "doors" : "show",
    status: ["cancelled", "postponed", "soldout"].includes(e.status)
      ? e.status
      : "scheduled",
    timezone: text(e.timezone, 80),
    ticketUrl: url(e.ticketUrl),
    image: url(e.image),
    venue: {
      id: text(e.venue?.id, 200),
      metro: text(e.venue?.metro, 80),
      lat: Number.isFinite(e.venue?.lat) ? e.venue.lat : null,
      lng: Number.isFinite(e.venue?.lng) ? e.venue.lng : null,
      room: text(e.venue?.room, 100),
      layout: text(e.venue?.layout),
      description: text(e.venue?.description, 1000),
      descriptionSource: url(e.venue?.descriptionSource),
      capacity: Number.isFinite(e.venue?.capacity?.max)
        ? {
            min: Number(e.venue.capacity.min) || e.venue.capacity.max,
            max: e.venue.capacity.max,
            configuration: text(e.venue.capacity.configuration),
            source: url(e.venue.capacity.source),
            approximate: !!e.venue.capacity.approximate,
          }
        : null,
      name: text(e.venue?.name),
      locality: text(e.venue?.locality),
      address: text(e.venue?.address),
    },
    genres: Array.isArray(e.genres)
      ? e.genres.slice(0, 10).map((g) => text(g, 80))
      : [],
  };
}
export async function ownerLists(owner) {
  const ids = (await storage.get("list-index:" + owner)) || [];
  const lists = await Promise.all(
    ids.map((id) => storage.get("shared-list:" + id)),
  );
  return lists
    .filter((l) => l && l.owner === owner && !l.revoked)
    .map(({ owner, ...list }) => list);
}
export async function saveList(owner, body) {
  const title = text(body.title, 100).trim();
  if (!title) throw fail("Name your list.");
  if (
    !Array.isArray(body.events) ||
    !body.events.length ||
    body.events.length > 100
  )
    throw fail("Choose between 1 and 100 concerts.");
  const events = [
    ...new Map(body.events.map(publicConcert).map((e) => [e.id, e])).values(),
  ];
  const id = body.id || randomBytes(24).toString("base64url");
  if (!/^[A-Za-z0-9_-]{32}$/.test(id)) throw fail("Invalid list link.");
  if (!body.id)
    await storage.update("list-index:" + owner, (ids) => {
      ids ||= [];
      if (ids.length >= 100) throw fail("You can create up to 100 lists.");
      return [...ids, id];
    });
  const result = await storage.update("shared-list:" + id, (old) => {
    if (body.id && (!old || old.owner !== owner || old.revoked))
      throw fail("List not found.", 404);
    return {
      id,
      owner,
      title,
      events,
      createdAt: old?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revoked: false,
    };
  });
  const { owner: ignored, ...list } = result;
  return list;
}
export async function readList(id) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(id || "")) throw fail("List not found.", 404);
  const list = await storage.get("shared-list:" + id);
  if (!list || list.revoked)
    throw fail("This list is unavailable or its link has been disabled.", 404);
  const { owner, ...publicList } = list;
  return publicList;
}
export async function revokeList(owner, id) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(id || "")) throw fail("List not found.", 404);
  await storage.update("shared-list:" + id, (old) => {
    if (!old || old.owner !== owner) throw fail("List not found.", 404);
    return { ...old, revoked: true, events: [] };
  });
  await storage.update("list-index:" + owner, (ids) =>
    (ids || []).filter((value) => value !== id),
  );
  return { ok: true };
}
