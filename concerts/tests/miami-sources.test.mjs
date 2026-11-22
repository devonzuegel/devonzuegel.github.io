import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseVenue } from "../server/parsers.mjs";
import { mergeCatalogEvents } from "../server/catalog-merge.mjs";

const venues = JSON.parse(
  await readFile(new URL("../data/venues.json", import.meta.url)),
);
const aire = venues.find((venue) => venue.id === "aire");
const regional = venues.find((venue) => venue.id === "19hz-miami");
const now = new Date("2026-11-22T12:00:00Z");
const item = {
  slug: "art-week",
  title: "Art Week",
  ymd: "2026-12-04",
  doors: "9 PM",
  until: "4 AM",
  lineup: "HVMZA, 305Mandy, Eren",
  artists: [{ name: "HVMZA" }],
  musicStyle: "Afro house",
  cta: { kind: "tickets", href: "https://shotgun.live/events/art-week" },
};
const frame = (text) =>
  `<script>self.__next_f.push(${JSON.stringify([1, text])})</script>`;
function html(items) {
  const stream =
    '1:I["unrelated"]\n2:' +
    JSON.stringify(["$", "section", null, { events: items }]) +
    "\n";
  return frame(stream.slice(0, 80)) + frame(stream.slice(80));
}
const row = (title, place, ticket, date = "2026/12/04", time = "9pm-4am") =>
  `<table><tr><td>Fri: Dec 4 (${time})</td><td><a href="${ticket}">${title}</a> @ ${place}</td><td>house, tech house</td><td></td><td></td><td></td><td>${date}</td></tr></table>`;
const parseRegional = (markup) => parseVenue(regional, markup, now, { venues });

test("AIRE and Miami regional discovery are registered for automatic refresh", () => {
  assert.equal(aire.parser, "aire");
  assert.equal(regional.parser, "19hz-miami");
});

test("AIRE reads streamed public data with full lineup and venue-local doors times", () => {
  const [event] = parseVenue(aire, html([item]), now);
  assert.equal(event.date, "2026-12-04");
  assert.equal(event.startAt, "2026-12-05T02:00:00.000Z");
  assert.equal(event.timeKind, "doors");
  assert.equal(event.showTime, null);
  assert.equal(event.endDate, undefined);
  assert.deepEqual(
    event.artists.map((artist) => artist.name),
    ["HVMZA", "305Mandy", "Eren"],
  );
  assert.deepEqual(event.genres, ["Electronic", "World"]);
  assert.equal(event.ticketUrl, item.cta.href);
  assert.equal(event.venue.lat, 25.7958292);
  assert.ok(
    event.sources.some(
      (source) => source.url === "https://airemia.com/events/art-week",
    ),
  );
});

test("AIRE uses explicit years, preserves cancellations, and rejects malformed calendars", () => {
  const [event] = parseVenue(
    aire,
    html([
      { ...item, title: "NYE 2027", ymd: "2026-12-31", isCancelled: true },
    ]),
    now,
  );
  assert.equal(event.date, "2026-12-31");
  assert.equal(event.status, "cancelled");
  assert.throws(
    () => parseVenue(aire, html([{ ...item, ymd: "2026-02-30" }]), now),
    /no readable/,
  );
  assert.throws(
    () => parseVenue(aire, "<html>Unavailable</html>", now),
    /could not be read/,
  );
  assert.deepEqual(parseVenue(aire, html([]), now), []);
  const [noLineup] = parseVenue(
    aire,
    html([
      {
        ...item,
        lineup: "House, tech house",
        musicStyle: "House, tech house",
        artists: [],
      },
    ]),
    now,
  );
  assert.deepEqual(
    noLineup.artists.map((artist) => artist.name),
    ["Art Week"],
  );
});

test("Miami discovery includes other clubs, uses Eastern time, and resolves only verified venue aliases", () => {
  const [event] = parseRegional(
    row(
      "DJ Night",
      "Floyd (Miami)",
      "https://dice.fm/event/example",
      "2026/12/04",
      "11pm-5am",
    ),
  );
  assert.equal(event.venue.name, "Floyd");
  assert.equal(event.metro, "miami");
  assert.equal(event.startAt, "2026-12-05T04:00:00.000Z");
  assert.equal(event.venue.lat, undefined);
  assert.equal(event.provenance.time.secondary, true);
  const [known] = parseRegional(row("DJ Night", "Aire (Miami)", item.cta.href));
  assert.equal(known.venue.id, "aire");
  assert.equal(known.venue.name, "AIRE Miami");
  const [differentCity] = parseRegional(
    row("DJ Night", "Aire (Fort Lauderdale)", item.cta.href),
  );
  assert.notEqual(differentCity.venue.id, "aire");
  assert.equal(
    parseRegional(row("Undated night", "Floyd (Miami)", item.cta.href, ""))
      .length,
    0,
  );
});

test("shared tickets and corroborated lineups merge without losing official times or sources", () => {
  const official = parseVenue(aire, html([item]), now);
  const community = parseRegional(
    row(
      "Different title",
      "Aire (Miami)",
      "https://shotgun.live/en/events/art-week?utm_source=19hz",
    ),
  );
  const extraSeller = parseRegional(
    row(
      "HVMZA, 305Mandy, Eren",
      "Aire (Miami)",
      "https://posh.vip/e/art-week",
      "2026/12/04",
      "8pm-4am",
    ),
  );
  for (const events of [
    [...official, ...community, ...extraSeller],
    [...extraSeller, ...community, ...official],
  ]) {
    const [event, duplicate] = mergeCatalogEvents(events);
    assert.equal(duplicate, undefined);
    assert.equal(event.title, "Art Week");
    assert.equal(event.time, "21:00");
    assert.equal(event.timeKind, "doors");
    assert.ok(
      event.dataConflicts.some((conflict) => conflict.field === "time"),
    );
    assert.ok(event.sources.some((source) => source.url === regional.url));
    assert.ok(
      event.sources.some(
        (source) => source.url === "https://posh.vip/e/art-week",
      ),
    );
    assert.ok(event.aliases.includes(community[0].id));
  }
});

test("distinct nights, different venues and ambiguous same-day shows survive reconciliation", () => {
  const official = parseVenue(aire, html([item]), now);
  const unrelated = parseRegional(
    row("Someone Else", "Aire (Miami)", "https://ra.co/events/other"),
  );
  const otherDay = parseRegional(
    row(
      "HVMZA, 305Mandy",
      "Aire (Miami)",
      "https://ra.co/events/tomorrow",
      "2026/12/05",
    ),
  );
  const otherVenue = parseRegional(
    row("HVMZA, 305Mandy", "Floyd (Miami)", "https://ra.co/events/another"),
  );
  assert.equal(
    mergeCatalogEvents([...official, ...unrelated, ...otherDay, ...otherVenue])
      .length,
    4,
  );
  const secondShow = parseVenue(
    aire,
    html([{ ...item, slug: "early-show", doors: "6 PM", cta: {} }]),
    now,
  );
  const ambiguous = parseRegional(
    row(
      "HVMZA, 305Mandy",
      "Aire (Miami)",
      "https://ra.co/events/unknown",
      "2026/12/04",
      "8pm-4am",
    ),
  );
  assert.equal(
    mergeCatalogEvents([...official, ...secondShow, ...ambiguous]).length,
    3,
  );
});

test("ticket matching preserves event query IDs and never matches a calendar homepage", () => {
  const official = parseVenue(
    aire,
    html([
      {
        ...item,
        cta: { kind: "tickets", href: "https://tickets.example/event?id=one" },
      },
    ]),
    now,
  );
  const different = parseRegional(
    row("Someone Else", "Aire (Miami)", "https://tickets.example/event?id=two"),
  );
  assert.equal(mergeCatalogEvents([...official, ...different]).length, 2);
  official[0].ticketUrl = aire.url;
  different[0].ticketUrl = aire.url;
  assert.equal(mergeCatalogEvents([...official, ...different]).length, 2);
});
