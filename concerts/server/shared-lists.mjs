import { sharedNotesFor } from "../shared/shared-notes.js";
import { randomBytes } from "node:crypto";
import * as storage from "./storage.mjs";
import { listDateError, concertInRange } from "../shared/list-dates.js";
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
const provenance = value => Object.fromEntries(Object.entries(value||{}).slice(0,20).filter(([,v])=>v && typeof v === "object").map(([key,v])=>[text(key,80),{secondary:!!v.secondary,match:text(v.match),checkedAt:text(v.checkedAt,40),sources:(Array.isArray(v.sources)?v.sources:[]).slice(0,5).map(s=>({name:text(s.name),url:url(s.url)}))}]));
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
    aliases: (Array.isArray(e.aliases) ? e.aliases : []).filter(id => typeof id === "string" && id.length <= 200 && /^[a-zA-Z0-9_.:-]+$/.test(id)).slice(0,20),
    title: text(e.title),
    metro: text(e.metro, 80),
    provenance: provenance(e.provenance),
    dataConflicts: (Array.isArray(e.dataConflicts)?e.dataConflicts:[]).slice(0,20).map(c=>({field:text(c.field,80),sources:(Array.isArray(c.sources)?c.sources:[]).slice(0,5).map(s=>({name:text(s.name),url:url(s.url)}))})),
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
    showTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(e.showTime || "") ? e.showTime : "",
    doorsTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(e.doorsTime || "") ? e.doorsTime : "",
    endAt: typeof e.endAt === "string" && Number.isFinite(Date.parse(e.endAt)) ? text(e.endAt,40) : "",
    timeKind: e.timeKind === "doors" ? "doors" : "show",
    status: ["cancelled", "postponed", "soldout"].includes(e.status)
      ? e.status
      : "scheduled",
    timezone: text(e.timezone, 80),
    ticketUrl: url(e.ticketUrl),
    image: url(e.image),
    venue: {
      id: text(e.venue?.id, 200),
      provenance: provenance(e.venue?.provenance),
      locationSource: url(e.venue?.locationSource),
      locationApproximate: !!e.venue?.locationApproximate,
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
  let dateRange;
  if (body.dateRange != null) {
    const error = listDateError(body.dateRange);
    if (error) throw fail(error);
    dateRange = { from: body.dateRange.from, to: body.dateRange.to };
  }
  if (
    !Array.isArray(body.events) ||
    (!body.events.length && !dateRange) ||
    body.events.length > 100
  )
    throw fail(dateRange ? "Choose up to 100 concerts." : "Choose between 1 and 100 concerts.");
  const events = [
    ...new Map(body.events.map(publicConcert).map((e) => [e.id, e])).values(),
  ];
  if (dateRange && events.some((e) => !concertInRange(e, dateRange)))
    throw fail("Choose concerts within the saved date range.");
  if (body.plannedIds !== undefined && (!Array.isArray(body.plannedIds) || body.plannedIds.some(id => typeof id !== "string")))
    throw fail("Invalid planned concerts.");
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
    // Older clients must not silently erase a list's saved dates.
    const savedRange = dateRange || old?.dateRange;
    if (savedRange && events.some((e) => !concertInRange(e, savedRange)))
      throw fail("Choose concerts within the saved date range.");
    return {
      id,
      owner,
      title,
      events,
      plannedIds: [...new Set(body.plannedIds ?? old?.plannedIds ?? [])].filter(id => events.some(e => e.id === id)),
      ...(savedRange ? { dateRange: savedRange } : {}),
      createdAt: old?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revoked: false,
    };
  });
  const { owner: ignored, ...list } = result;
  return list;
}
export async function addToList(owner, id, concert) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(id || "")) throw fail("List not found.", 404);
  const event = publicConcert(concert);
  const result = await storage.update("shared-list:" + id, (old) => {
    if (!old || old.owner !== owner || old.revoked) throw fail("List not found.", 404);
    if (old.events.some((e) => e.id === event.id)) return old;
    if (old.dateRange && !concertInRange(event, old.dateRange))
      throw fail("This concert is outside the list’s date range.");
    if (old.events.length >= 100) throw fail("This list already has 100 concerts.");
    return { ...old, events: [...old.events, event], updatedAt: new Date().toISOString() };
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
  const profile = await storage.get('profile:' + owner);
  return {...publicList, sharedNotes: sharedNotesFor(list.events, profile?.fields || {}), sharedBy: text(owner, 80)};
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
