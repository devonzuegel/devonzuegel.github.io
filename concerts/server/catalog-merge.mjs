import { mergeEventRecords } from "../shared/event-merge.js";
import { mergeEvents, normalize } from "../shared/core.js";
import { sameVenue } from "../shared/enrichment.js";

function ticketIdentity(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "shotgun.live")
      url.pathname = url.pathname.replace(/^\/[a-z]{2}\/events\//, "/events/");
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

// Reconcile community listings with a verified venue calendar. A venue/date alone
// is never enough: require the same ticket, title, or multiple named performers.
export function mergeCatalogEvents(events) {
  const official = events.filter(
    (event) =>
      event.sourceId === event.venue?.id && !event.provenance?.time?.secondary,
  );
  const replacements = new Map();
  const remaining = [];
  for (const event of events) {
    if (event.sourceId !== "19hz-miami") {
      remaining.push(event);
      continue;
    }
    const candidates = official.filter(
      (other) => other.date === event.date && sameVenue(event, other),
    );
    const matches = candidates.filter((other) => {
      const ticket = ticketIdentity(event.ticketUrl);
      if (
        ticket &&
        ticket !== ticketIdentity(other.venue.url) &&
        ticket === ticketIdentity(other.ticketUrl)
      )
        return true;
      if (
        normalize(event.title) === normalize(other.title) &&
        event.time === other.time
      )
        return true;
      if (candidates.length !== 1) return false;
      const title = ` ${normalize(event.title)} `;
      const names = new Set(
        other.artists
          .map((artist) => normalize(artist.name))
          .filter((name) => name.length >= 3),
      );
      return (
        [...names].filter((name) => title.includes(` ${name} `)).length >= 2
      );
    });
    if (matches.length !== 1) {
      remaining.push(event);
      continue;
    }
    const target = mergeEventRecords(replacements.get(matches[0].id) || matches[0], event);
    replacements.set(target.id, target);
  }
  return mergeEvents(
    remaining.map((event) => replacements.get(event.id) || event),
  );
}
