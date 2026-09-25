import test from "node:test";
import assert from "node:assert/strict";
import {
  localToISO,
  calendarICS,
  filterEvents,
  DEFAULT_CITIES,
  importSpotifyHistory,
  spotifyMatch,
  mergeEvents,
  allEvents,
  savedCounts,
  dateRange,
} from "../shared/core.js";
test("this weekend includes its Friday even on Saturday or Sunday", () => {
  for (const day of [18, 19, 20]) {
    assert.deepEqual(dateRange("weekend", new Date(2026, 8, day, 12)), {
      from: "2026-09-18",
      to: "2026-09-20",
    });
  }
});
test("next weekend is Friday through Sunday after this weekend, including across years", () => {
  for (let day = 14; day <= 20; day++) {
    assert.deepEqual(dateRange("next-weekend", new Date(2026, 8, day, 12)), {
      from: "2026-09-25",
      to: "2026-09-27",
    });
  }
  assert.deepEqual(dateRange("next-weekend", new Date(2026, 11, 27, 12)), {
    from: "2027-01-01",
    to: "2027-01-03",
  });
});
const concert = (extra = {}) => ({
  id: "show-1",
  title: "Björk, live; acoustic",
  artists: [{ name: "Björk" }],
  date: "2026-11-02",
  time: "00:30",
  timezone: "America/New_York",
  metro: "nyc",
  status: "scheduled",
  venue: {
    id: "room",
    name: "The Room",
    metro: "nyc",
    lat: 40.72,
    lng: -74,
    address: "1 Main, New York",
    capacity: null,
  },
  genres: [],
  ticketUrl: "https://example.com/tickets",
  ...extra,
});
const filters = {
  cities: DEFAULT_CITIES.map((c) => ({ ...c, enabled: true })),
  from: "2026-09-19",
  to: "2026-11-18",
  tab: "discover",
};
test("local times respect DST, late nights, and nonexistent spring times", () => {
  assert.equal(
    localToISO("2026-11-02", "00:30", "America/New_York"),
    "2026-11-02T05:30:00.000Z",
  );
  assert.equal(
    localToISO("2026-07-02", "20:00", "America/Los_Angeles"),
    "2026-07-03T03:00:00.000Z",
  );
  assert.equal(localToISO("2026-03-08", "02:30", "America/New_York"), null);
  assert.equal(localToISO("2026-02-30", "20:00", "America/New_York"), null);
});
test("calendar exports local time as UTC, escapes text, omits private notes and guessed end times", () => {
  const text = calendarICS(
    [concert({ notes: "private thought" })],
    new Date("2026-09-19T12:00Z"),
  );
  assert.match(text, /DTSTART:20261102T053000Z/);
  assert.match(text, /SUMMARY:Björk\\, live\\; acoustic/);
  assert.ok(!text.includes("DTEND"));
  assert.ok(!text.includes("private thought"));
  assert.ok(text.endsWith("\r\n"));
});
test("unknown performance time exports a date, cancelled shows do not export", () => {
  const text = calendarICS([
    concert({ time: null }),
    concert({ id: "cancelled", status: "cancelled" }),
  ]);
  assert.match(text, /DTSTART;VALUE=DATE:20261102/);
  assert.match(text, /Time TBA/);
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 1);
});
test("calendar folds UTF-8 lines by byte count without breaking characters", () => {
  const text = calendarICS([concert({ title: "音楽".repeat(100) })]);
  for (const line of text.split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
  assert.ok(!text.includes("�"));
});
test("city switches, unknown genres, and size ranges produce honest results", () => {
  const list = [
    concert(),
    concert({
      id: "known",
      genres: ["Rock"],
      venue: { id: "b", name: "B", capacity: { min: 225, max: 700 } },
    }),
  ];
  assert.deepEqual(
    filterEvents(list, { ...filters, genre: "Unknown" }).map((e) => e.id),
    ["show-1"],
  );
  assert.deepEqual(
    filterEvents(list, { ...filters, size: "unknown" }).map((e) => e.id),
    ["show-1"],
  );
  assert.deepEqual(
    filterEvents(list, { ...filters, size: "intimate" }).map((e) => e.id),
    ["known"],
  );
  assert.equal(
    filterEvents(list, {
      ...filters,
      cities: DEFAULT_CITIES.map((c) => ({ ...c, enabled: false })),
    }).length,
    0,
  );
});
test("saved counts are global; past snapshots survive feed removal", () => {
  const e = concert({ date: "2025-11-02" });
  const fields = {
    "event/show-1/saved": { value: true },
    "event/show-1/snapshot": { value: e },
  };
  const list = allEvents([], fields);
  assert.equal(list[0].missingFromFeed, true);
  assert.deepEqual(savedCounts(list, fields, new Date("2026-09-19")), {
    total: 1,
    upcoming: 0,
  });
  assert.equal(
    filterEvents(list, { ...filters, tab: "saved", savedPeriod: "all" }, fields)
      .length,
    1,
  );
});
test("streaming-history import supports both Spotify formats and ignores short skips/podcasts", () => {
  const data = importSpotifyHistory([
    { artistName: "Björk", msPlayed: 120000 },
    { master_metadata_album_artist_name: "Björk", ms_played: 180000 },
    { artistName: "Skipped", msPlayed: 1000 },
    { episode_name: "Podcast", ms_played: 100000 },
  ]);
  assert.equal(data.count, 2);
  assert.equal(data.artists.bjork.minutes, 5);
  assert.equal(spotifyMatch(concert(), data.artists).plays, 2);
  assert.equal(spotifyMatch(concert(), null), null);
});
test("deduplication merges duplicate source records but preserves separate sets and nights", () => {
  const e = concert();
  const merged = mergeEvents([
    e,
    {
      ...e,
      id: "provider-2",
      sources: [{ name: "Other", url: "https://example.org" }],
    },
    { ...e, id: "late", time: "22:30" },
    { ...e, id: "tomorrow", date: "2026-11-03" },
  ]);
  assert.equal(merged.length, 3);
  assert.deepEqual(merged[0].aliases, ["provider-2"]);
});
test("pasted YouTube URLs accept only genuine video URL hosts and IDs", async () => {
  const { youtubeVideoID } = await import("../shared/core.js");
  assert.equal(
    youtubeVideoID("https://youtu.be/abcdefghijk?t=30"),
    "abcdefghijk",
  );
  assert.equal(
    youtubeVideoID("https://www.youtube.com/watch?v=abcdefghijk"),
    "abcdefghijk",
  );
  assert.equal(
    youtubeVideoID("https://youtube.com.attacker.test/watch?v=abcdefghijk"),
    null,
  );
  assert.equal(youtubeVideoID("javascript:alert(1)"), null);
});

test("hidden concerts leave discovery and saved views without losing personal data", () => {
  const event = concert();
  const fields = {
    "event/show-1/hidden": { value: true },
    "event/show-1/saved": { value: true },
    "event/show-1/notes": { value: "Great visuals" },
    "event/show-1/snapshot": { value: event },
  };
  assert.equal(filterEvents([event], filters, fields).length, 0);
  assert.equal(
    filterEvents([event], { ...filters, tab: "saved" }, fields).length,
    0,
  );
  assert.equal(savedCounts([event], fields).total, 0);
  const hiddenFilters = {
    ...filters,
    tab: "hidden",
    cities: [],
    from: "2030-01-01",
    to: "2030-01-02",
    genre: "Rock",
    matches: true,
  };
  assert.equal(
    filterEvents(allEvents([], fields), hiddenFilters, fields).length,
    1,
  );
  assert.equal(
    filterEvents([event], { ...hiddenFilters, query: "visuals" }, fields)
      .length,
    1,
  );
  assert.equal(
    filterEvents([event], { ...hiddenFilters, query: "no match" }, fields)
      .length,
    0,
  );
  fields["event/show-1/hidden"].value = false;
  assert.equal(filterEvents([event], filters, fields).length, 1);
  assert.equal(
    filterEvents([event], { ...filters, tab: "saved" }, fields).length,
    1,
  );
  assert.equal(filterEvents([event], hiddenFilters, fields).length, 0);
  assert.equal(fields["event/show-1/notes"].value, "Great visuals");
});
