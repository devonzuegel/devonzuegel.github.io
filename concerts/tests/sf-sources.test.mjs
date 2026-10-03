import test from "node:test";
import assert from "node:assert/strict";
import { parseVenue } from "../server/parsers.mjs";
const venue = {
  id: "test",
  name: "Test",
  metro: "sf",
  url: "https://example.com/",
  timezone: "America/Los_Angeles",
};
test("See calendar reads explicit month and year beyond initial cards", () => {
  const html =
    '<div class="seetickets-calendar-year-month-container">January 2027</div><table><tr><td><div class="date-number">08</div><div class="seetickets-calendar-event-container"><div class="event-title"><a href="https://example.com/show">Artist</a></div><div class="doortime-showtime">Showtime: 8:00PM</div></div></td></tr></table>';
  const [e] = parseVenue(
    { ...venue, parser: "see" },
    html,
    new Date("2026-10-02"),
  );
  assert.equal(e.date, "2027-01-08");
  assert.equal(e.time, "20:00");
});
test("Fillmore keeps cancellation state and excludes multi-show passes", () => {
  const event = {
    "@type": "MusicEvent",
    name: "Artist",
    startDate: "2026-10-03T20:00:00-07:00",
    url: "https://example.com/show",
    eventStatus: "https://schema.org/EventCancelled",
  };
  const html = [event, { ...event, name: "Artist - Seven (7) Show Ticket" }]
    .map(
      (e) => `<script type="application/ld+json">${JSON.stringify(e)}</script>`,
    )
    .join("");
  const events = parseVenue({ ...venue, parser: "fillmore" }, html);
  assert.equal(events.length, 1);
  assert.equal(events[0].status, "cancelled");
  assert.equal(events[0].time, "20:00");
});
test("Warfield reads show times, support and direct ticket links", () => {
  const [e] = parseVenue(
    { ...venue, parser: "warfield" },
    '<div class="entry"><h3><a href="https://example.com/event">Palace</a></h3><div class="title"><h4>with Rollo Doherty</h4></div><span class="date">Sat, Oct 10, 2026</span><span class="time">Show 8:00 PM</span><a class="btn-tickets" href="https://example.com/ticket">Buy Tickets</a></div>',
  );
  assert.equal(e.date, "2026-10-10");
  assert.equal(e.ticketUrl, "https://example.com/ticket");
  assert.equal(e.artists[1].name, "Rollo Doherty");
});
