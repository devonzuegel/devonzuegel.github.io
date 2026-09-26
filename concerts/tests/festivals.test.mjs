import test from "node:test";
import assert from "node:assert/strict";
import {
  festivalRange,
  parseFestival,
  readFestival,
} from "../server/festivals.mjs";
import {
  isUpcoming,
  calendarICS,
  filterEvents,
  DEFAULT_CITIES,
  mergeEvents,
} from "../shared/core.js";
const source = {
  id: "festival-iii",
  name: "III Points",
  metro: "miami",
  timezone: "America/New_York",
  url: "https://www.iiipoints.com/",
  venueName: "Mana Wynwood",
  locality: "Miami",
};
const html =
  '<title>III Points | October 16-17, 2026</title><script type="application/ld+json">{"startDate":"2021-10-22"}</script>';
const event = parseFestival(source, html);
test("festival dates require explicit years and valid bounded ranges", () => {
  assert.deepEqual(festivalRange("March 26 • 27 • 28, 2027"), {
    date: "2027-03-26",
    endDate: "2027-03-28",
  });
  assert.deepEqual(
    festivalRange("Saturday, September 26 and Sunday, September 27, 2026"),
    { date: "2026-09-26", endDate: "2026-09-27" },
  );
  for (const text of [
    "October 16-17",
    "February 29-30, 2026",
    "October 17-16, 2026",
    "October 1-30, 2026",
  ])
    assert.throws(() => festivalRange(text));
});
test("current published dates override stale schema, and old lineups are excluded", () => {
  assert.equal(event.date, "2026-10-16");
  assert.equal(event.endDate, "2026-10-17");
  const old = parseFestival(source, html, {
    lineupHTML:
      '<title>Lineup 2025</title><a data-artist-name="Old Artist"></a>',
  });
  assert.equal(old.lineupPublished, false);
  const current = parseFestival(source, html, {
    lineupHTML:
      '<title>Lineup 2026</title><a data-artist-name="Artist"></a><a data-artist-name="Artist"></a>',
  });
  assert.deepEqual(current.artists, [{ name: "Artist" }]);
  assert.equal(mergeEvents([event, current]).length, 1);
  assert.equal(event.venue.lat, null);
});
test("festivals stay upcoming and in date filters through their final local day", () => {
  assert.equal(isUpcoming(event, new Date("2026-10-18T03:59:00Z")), true);
  assert.equal(isUpcoming(event, new Date("2026-10-18T04:01:00Z")), false);
  const filters = { tab: "all", from: "2026-10-17", to: "2026-10-17" };
  assert.equal(
    filterEvents([event], filters, {}, DEFAULT_CITIES, {}).length,
    1,
  );
  assert.equal(
    filterEvents(
      [event],
      { ...filters, from: "2026-10-18", to: "2026-10-18" },
      {},
      DEFAULT_CITIES,
      {},
    ).length,
    0,
  );
});
test("multi-day calendar export uses an exclusive end date without invented times", () => {
  const ics = calendarICS([event]);
  assert.match(ics, /DTSTART;VALUE=DATE:20261016/);
  assert.match(ics, /DTEND;VALUE=DATE:20261018/);
});
test("unreadable festival dates fail instead of silently erasing listings", async () => {
  await assert.rejects(
    readFestival(source, new Date(), async () => "<title>Coming soon</title>"),
    /explicitly dated/,
  );
});

test("Hardly Strictly imports the full readable lineup, including artists without Apple Music links", () => {
  const e = parseFestival(
    { ...source, id: "festival-hsb" },
    "<title>Info</title><body>October 2-4, 2026</body>",
    {
      lineupHTML:
        '<title>2026 Schedule</title><div class="inside"><a href="/artist/a"><div class="name">Artist A</div></a><div class="name">Artist B</div><div class="name">Artist A</div></div>',
    },
  );
  assert.deepEqual(e.artists, [{ name: "Artist A" }, { name: "Artist B" }]);
});
