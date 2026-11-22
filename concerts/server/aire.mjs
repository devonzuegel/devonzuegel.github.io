import * as cheerio from "cheerio";
import { makeEvent, clean, parseDate, parseTime } from "./parsers.mjs";

// Read the published calendar's JSON payload without evaluating page scripts.
export function parseAire(venue, html, now = new Date()) {
  const $ = cheerio.load(html);
  let stream = "";
  $("script").each((_, node) => {
    const match = $(node)
      .text()
      .match(/^self\.__next_f\.push\((\[[\s\S]*\])\)\s*;?$/);
    if (!match) return;
    try {
      const frame = JSON.parse(match[1]);
      if (frame[0] === 1 && typeof frame[1] === "string") stream += frame[1];
    } catch {
      /* Ignore unrelated or incomplete frames. */
    }
  });
  const items = [];
  let foundCalendar = false;
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value.events)) {
      foundCalendar = true;
      items.push(...value.events);
    }
    for (const child of Object.values(value))
      if (typeof child === "object") walk(child);
  }
  for (const line of stream.split("\n")) {
    try {
      walk(JSON.parse(line.slice(line.indexOf(":") + 1)));
    } catch {}
  }
  if (!foundCalendar)
    throw new Error("AIRE's published calendar could not be read.");
  const events = items
    .map((item) => {
      // Never infer a year from the title (e.g. NYE 2027 on December 31, 2026).
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.ymd || "") || !item.slug)
        return null;
      const lineup =
        clean(item.lineup) !== clean(item.musicStyle)
          ? clean(item.lineup).split(/,\s*/)
          : [];
      const event = makeEvent(
        venue,
        {
          id: `${venue.id}-${item.slug}`,
          title: item.title,
          date: parseDate(item.ymd),
          time: parseTime(item.doors),
          timeKind: "doors",
          artists: [
            ...lineup,
            ...(item.artists || []).map((artist) => artist.name),
          ].filter(Boolean),
          genres: clean(item.musicStyle).split(/,\s*/),
          url: new URL(`/events/${encodeURIComponent(item.slug)}`, venue.url)
            .href,
          ticketUrl: item.cta?.kind === "tickets" ? item.cta.href : null,
          image: item.flyerUrl,
          status: item.isCancelled
            ? "cancelled"
            : item.soldOut
              ? "sold out"
              : "scheduled",
          extra: { description: clean(item.description) },
        },
        now,
      );
      if (event?.ticketUrl && event.ticketUrl !== event.sources[0].url)
        event.sources.push({ name: "Tickets", url: event.ticketUrl });
      return event;
    })
    .filter(Boolean);
  if (items.length && !events.length)
    throw new Error("AIRE's calendar contained no readable dated events.");
  return [...new Map(events.map((event) => [event.id, event])).values()];
}
