import { sharedNoteFor } from "./shared-notes.js";
import { dateLabel, escapeHTML as esc } from "./core.js?v=20261123-plan2";
import { clockLabel, eventTiming, HOUR } from "./event-timing.js";

export function plannedEvents(events, ids = []) {
  const selected = new Set(ids);
  return events.filter(e => selected.has(e.id) || e.aliases?.some(id => selected.has(id)))
    .map(event => ({event, start:eventTiming(event).start}))
    .sort((a,b) => (a.event.date || "").localeCompare(b.event.date || "") ||
      (a.start ?? Infinity) - (b.start ?? Infinity))
    .map(({event}) => event);
}

function daySchedule(shows) {
  const timed = shows.filter(show => show.start !== null);
  if (!timed.length) return null;
  const start = Math.floor(timed[0].start/HOUR) * HOUR;
  const labelSpace = 36 * 60000;
  const end = Math.ceil(Math.max(...timed.map(show => Math.max(show.end ?? 0, show.start + labelSpace)))/HOUR)*HOUR;
  const groups = [];
  let group;
  for (const show of timed) {
    const occupiedUntil = Math.max(show.end ?? 0, show.start + labelSpace);
    if (!group || group.until <= show.start) {
      group = {until:occupiedUntil, lanes:[], shows:[]};
      groups.push(group);
    }
    let lane = group.lanes.findIndex(until => until <= show.start);
    if (lane < 0) lane = group.lanes.length;
    group.lanes[lane] = occupiedUntil;
    group.until = Math.max(group.until, occupiedUntil);
    group.shows.push({ ...show, lane });
  }
  return {start,end,groups};
}

function planCard(show, interactive, geometry = "") {
  const {event,start,end,doors,index} = show;
  const title = esc(event.title);
  const timing = start === null ? "Start time TBA" : clockLabel(start) +
    (end === null ? " · end TBA" : "–" + clockLabel(end) + (new Date(start).getUTCDate() !== new Date(end).getUTCDate() ? " next day" : "")) +
    (doors ? " · doors" : "");
  const venue = esc(event.venue?.name || "Venue TBA");
  const tag = interactive ? "button" : "div";
  return '<' + tag + ' class="plan-event' + (end === null ? ' plan-open-ended' : '') + '"' +
    (interactive ? ' type="button" data-action="open" data-id="' + esc(event.id) + '" title="' + title + ' · ' + timing + ' · ' + venue + '"' : '') +
    (geometry ? ' style="' + geometry + '"' : '') + '><span class="plan-stop">' + index + '</span><strong>' + title +
    '</strong><span class="plan-time">' + timing + '</span><span class="plan-venue">' + venue + '</span></' + tag + '>';
}

function calendarMarkup(shows, day, interactive) {
  const schedule = daySchedule(shows);
  if (!schedule) return "";
  const {start,end,groups} = schedule;
  const hours = (end-start)/HOUR;
  const guides = Array.from({length:hours+1}, (_, i) => {
    const time = start + i*HOUR;
    return '<div class="plan-grid-hour" style="--hour:' + i + '"><span>' + clockLabel(time) +
      (i > 0 && new Date(time).getUTCHours() === 0 ? ' <small>+1 day</small>' : '') + '</span></div>';
  }).join("");
  const cards = groups.flatMap(group => group.shows.map(show => {
    const top = (show.start-start)/HOUR;
    const duration = show.end === null ? 0 : (show.end-show.start)/HOUR;
    return planCard(show,interactive,"--start:" + top + ";--duration:" + duration +
      ";--lane:" + show.lane + ";--lanes:" + group.lanes.length);
  })).join("");
  return '<div class="plan-grid" style="--day-hours:' + hours + '" role="group" aria-label="' +
    esc(day) + ' schedule, venue local time">' + guides + cards + '</div>';
}

function venueMapMarkup(shows) {
  const stops = shows.map(({event,index,start}) => {
    const {lat,lng,name} = event.venue || {};
    const located = Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180;
    return { index, timed:start !== null, name:name || "Venue TBA", lat:located ? lat : null, lng:located ? lng : null };
  });
  const unavailable = stops.filter(stop => stop.lat === null);
  const hasMap = unavailable.length < stops.length;
  return '<section class="plan-map-panel" data-plan-stops="' + esc(JSON.stringify(stops)) + '"><div class="plan-map-heading"><h4>Venue map</h4>' +
    (hasMap && stops.filter(stop => stop.timed).length > 1 ?
      '<div class="plan-map-modes" role="group" aria-label="Routes shown on the map"><button type="button" data-route-mode="both" aria-pressed="true">Both</button><button type="button" data-route-mode="walking" aria-pressed="false">Walk</button><button type="button" data-route-mode="driving" aria-pressed="false">Drive</button></div>' : '') +
    '</div>' + (hasMap ? '<div class="plan-map" role="region" aria-label="Map of the day’s concert venues"></div><div class="plan-route-summary" aria-live="polite"></div>' : '') +
    (unavailable.length ? '<p class="plan-map-note">Location unavailable for ' + unavailable.map(stop => esc(stop.index + ' · ' + stop.name)).join(', ') + '.</p>' : '') + '</section>';
}

export function planMarkup(events, ids, {interactive = true, notes = {}} = {}) {
  const planned = plannedEvents(events, ids);
  if (!planned.length) return "";
  const days = new Map();
  for (const event of planned) {
    const day = event.date || "";
    const shows = days.get(day) || [];
    shows.push({event, ...eventTiming(event), index:shows.length+1});
    days.set(day, shows);
  }
  const markup = [...days].map(([day, shows]) => {
    const title = day ? dateLabel(day,{weekday:"long", month:"short", day:"numeric"}) : "Date TBA";
    const untimed = shows.filter(show => show.start === null);
    const showNotes = shows.map(({event,index}) => {
      const note = sharedNoteFor(event,{},notes);
      return note ? '<p class="plan-shared-note"><strong>' + index + ' · ' + esc(event.title) + '</strong> ' + esc(note) + '</p>' : '';
    }).join("");
    return '<section class="plan-day"><header><h3>' + esc(title) +
      '</h3><span>Venue local time</span></header>' + calendarMarkup(shows,title,interactive) +
      (untimed.length ? '<div class="plan-day-shows">' + untimed.map(show => planCard(show,interactive)).join("") + '</div>' : '') +
      (showNotes ? '<div class="plan-notes">' + showNotes + '</div>' : '') +
      (interactive ? venueMapMarkup(shows) : '') + '</section>';
  }).join("");
  return '<section class="concert-plan" aria-label="Proposed plan"><div class="plan-heading"><h2>★ Proposed plan</h2><span>' +
    planned.length + ' starred ' + (planned.length === 1 ? 'show' : 'shows') +
    '</span></div><div class="plan-calendar">' + markup + '</div></section>';
}
