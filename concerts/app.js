import { manageLists } from "./shared/share-lists.js";
import { enrichEventVenue } from "./shared/venue-profiles.js";
import { ActionHistory } from "./shared/action-history.js";
import qrcode from "./vendor/qrcode.mjs";
import { syncLink, parseSyncLink } from "./shared/qr-sync.js";
import {
  addHistoryDetails,
  historyRank,
  importFileMetadata,
} from "./shared/listening-details.js?v=20261002-startup";
import { captureResults, animateResults } from "./shared/results-motion.js";
import { addMapboxBasemap } from "./shared/mapbox-basemap.js?v=20260922-minimap-logo";
import { openRangePicker } from "./shared/range-picker.js";
import {
  mountVenueMaps,
  disposeVenueMaps,
} from "./shared/venue-maps.js?v=20260922-minimap-logo";
import {
  DEFAULT_CITIES,
  SIZE_BUCKETS,
  escapeHTML as esc,
  safeURL,
  normalize,
  dayInZone,
  addDays,
  dateRange,
  dateLabel,
  timeLabel,
  capacityLabel,
  assessment,
  citiesFrom,
  allEvents,
  filterEvents,
  savedCounts,
  spotifyMatch,
  groupVenues,
  importSpotifyHistory,
  calendarICS,
  isUpcoming,
  valueAt,
  youtubeVideoID,
  mergeEvents,
} from "./shared/core.js?v=20260924-hidden";
import { ClientStore } from "./shared/client-store.js";
import { searchArchive } from "./shared/archive.js";
let pendingQRSync = parseSyncLink(location.hash);
const hadQRSync = new URLSearchParams(location.hash.slice(1)).has("sync");
if (hadQRSync) {
  const cleanURL = new URL(location.href);
  cleanURL.hash = "";
  history.replaceState(null, "", cleanURL);
}
const config = window.CONCERTS_CONFIG || {},
  apiBase = config.apiBase || "/api/concerts";
const store = new ClientStore(apiBase);
const icons = {
  hide: '<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.5 5.3A11 11 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3 3.6M6.5 6.5A21 21 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.5-1.5"/>',
  restore: '<path d="M3 4v6h6M3 10a9 9 0 1 1 1 8"/>',
  search: '<circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 4.5 4.5"/>',
  explore: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  bookmark: '<path d="M6.5 4.5h11v16L12 17l-5.5 3.5z"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.1M4 12h.1M4 18h.1"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 3h2"/>',
  venue: '<path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6M8 10h1m6 0h1"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  music:
    '<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',
  spotify:
    '<circle cx="12" cy="12" r="9"/><path d="M6 9c4-2 8-1 12 1M7 12c3-1.5 7-.5 10 1M8 15c3-1 5-.5 8 1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M11 4H4v16h16v-7"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  size: '<path d="M4 18v-4m5 4v-7m5 7V8m5 10V5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 8a7 7 0 0 1 12-3L20 8M4 16l2.5 3a7 7 0 0 0 12-3"/>',
  headphones:
    '<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13h3v8H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 1-2Zm16 0h-3v8h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-1-2Z"/>',
  ticket:
    '<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM15 6v2m0 3v2m0 3v2"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.music}</svg>`;
const button = (action, label, cls = "secondary", attrs = "") =>
  `<button class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const $ = (q, root = document) => root.querySelector(q);
let savedUI = {};
try {
  savedUI = JSON.parse(localStorage.getItem("encore.ui.v1")) || {};
} catch {}
const collapsedMonths = new Set();
const state = {
  tab: "discover",
  view: "list",
  preset: "60",
  query: "",
  genre: "any",
  venue: "any",
  size: "any",
  sort: "date",
  matches: false,
  savedPeriod: "upcoming",
  ...savedUI,
  ...dateRange(savedUI.preset || "60"),
  feed: { events: [], sources: [] },
  loading: true,
  apiAvailable: false,
  capabilities: {},
  limit: 60,
  calendarMonth: dayInZone().slice(0, 7),
  mapPosition: null,
  mapSelection: null,
  selected: null,
  media: {
    artist: "",
    mode: "live",
    items: [],
    query: "",
    page: 1,
    loading: false,
  },
  unmapped: false,
};
let map = null,
  markerGroup = null,
  feedRequest = 0,
  mediaRequest = 0,
  toastTimer,
  modalReturnFocus,
  detailReturnFocus,
  renderTimer,
  detailNoteRev = 0;
function persistUI() {
  const {
    tab,
    view,
    preset,
    query,
    genre,
    venue,
    size,
    sort,
    matches,
    savedPeriod,
  } = state;
  try {
    localStorage.setItem(
      "encore.ui.v1",
      JSON.stringify({
        tab,
        view,
        preset,
        query,
        genre,
        venue,
        size,
        sort,
        matches,
        savedPeriod,
      }),
    );
  } catch {}
}
function toast(message, action = "") {
  const el = $("#toast");
  el.innerHTML = esc(message) + action;
  el.inert = false;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => {
      el.classList.remove("visible");
      el.inert = true;
    },
    action ? 10000 : 4200,
  );
}
const events = () =>
  allEvents(state.feed.events, store.fields).map(enrichEventVenue);
const listening = () => valueAt(store.fields, "listening", {});
const cities = () => citiesFrom(store.fields);
function effectiveCities() {
  const current = cities();
  if (state.tab === "saved") {
    for (const e of events().filter(
      (e) => assessment(store.fields, e.id).saved,
    )) {
      if (!current.some((c) => c.id === e.metro)) {
        const c = DEFAULT_CITIES.find((c) => c.id === e.metro) || {
          id: e.metro,
          name: e.metro,
          lat: e.venue.lat,
          lng: e.venue.lng,
          radius: 100,
        };
        current.push({ ...c, enabled: true });
      }
    }
  }
  return current;
}
const filtered = () =>
  filterEvents(
    events(),
    {
      ...state,
      cities: effectiveCities(),
      includeHidden: true,
    },
    store.fields,
    listening(),
  );
const cityFor = (id) =>
  cities().find((c) => c.id === id) ||
  DEFAULT_CITIES.find((c) => c.id === id) || {
    name: "Other city",
    short: "",
    color: "#7d8561",
  };
const eventFor = (id) => events().find((e) => e.id === id);
function icoButton(action, name, label, attrs = "", cls = "icon-btn") {
  return button(
    action,
    icon(name),
    cls,
    `aria-label="${esc(label)}" title="${esc(label)}" ${attrs}`,
  );
}
function shell() {
  $("#app").innerHTML =
    `<div class="layout"><aside class="sidebar" aria-label="Concert navigation"><a class="wordmark" href="./">Concert Tracker</a><div id="sidebar-content"></div><div class="sidebar-bottom" id="sidebar-bottom"></div></aside><main id="main" class="main"><div id="mobile-header"></div><div id="controls"></div><div id="results"></div></main></div>`;
  renderChrome();
  renderControls();
  renderResults();
}
function navMarkup(mobile = false) {
  const count = savedCounts(events(), store.fields);
  const hidden = events().filter(
    (e) => assessment(store.fields, e.id).hidden,
  ).length;
  return `<div class="${mobile ? "mobile-nav" : "main-nav"}">${button("tab", icon("explore") + "Discover", `nav-btn ${state.tab === "discover" ? "active" : ""}`, 'data-tab="discover"')}${button("tab", icon("bookmark") + 'Saved <span class="badge">' + count.upcoming + "</span>", `nav-btn ${state.tab === "saved" ? "active" : ""}`, 'data-tab="saved"')}${button("tab", icon("hide") + 'Not interested <span class="badge">' + hidden + "</span>", `nav-btn ${state.tab === "hidden" ? "active" : ""}`, 'data-tab="hidden"')}${mobile ? icoButton("profile", "user", "Your profile") : ""}</div>`;
}
function renderChrome() {
  const account = button(
    "profile",
    `${icon("user")}<span><small>${store.profile ? "Signed in as" : "Not signed in"}</small><strong>${esc(store.profile || "Guest · this device")}</strong></span>`,
    "account-button",
    `aria-label="${esc(store.profile ? "Signed in as " + store.profile : "Not signed in. Open account options")}"`,
  );
  const c = cities();
  $("#sidebar-content").innerHTML =
    navMarkup() +
    `<div class="sidebar-rule"></div><div class="sidebar-head"><span class="eyebrow">Your cities</span>${icoButton("cities", "plus", "Manage cities", "", "icon-btn small")}</div><div class="city-list">${c.map((city) => `<button class="city-toggle" data-action="toggle-city" data-city="${esc(city.id)}" aria-pressed="${city.enabled}" style="--city:${esc(city.color)}"><span class="city-dot" data-city="${esc(city.id)}"></span>${esc(city.name)}<span class="city-check">${city.enabled ? icon("check") : ""}</span></button>`).join("")}</div>${button("cities", icon("plus") + "Add a city", "subtle-btn")}<div class="sidebar-sources">${button("sources", icon("info") + "Sources", "subtle-btn")}</div><div class="listening-box">${button("listening", icon("spotify") + (Object.keys(listening() || {}).length ? "Your Spotify history" : "Add your Spotify listening history"), "small-button")}</div>`;
  $("#sidebar-bottom").innerHTML =
    `${button("profile", `<span class="avatar">${esc((store.profile || "D").slice(0, 1).toUpperCase())}</span><span class="profile-text"><strong>${esc(store.profile || "Account")}</strong><small title="${esc(store.lastError)}">${esc(store.status)}</small></span>${icon("down")}`, "profile-btn")}<a class="site-link" href="/">← Back to devonzuegel.com</a>`;
  $("#mobile-header").innerHTML =
    `<div class="mobile-brand"><div class="mobile-account-row"><a class="wordmark" href="./">Concert Tracker</a>${account}</div>${navMarkup(true)}</div>`;
}
let openWeekendTooltip = null;
function weekendLabel(preset) {
  const { from, to } = dateRange(preset);
  const format = (day) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).formatToParts(new Date(day + "T12:00:00Z"));
    return ["weekday", "day", "month"]
      .map((type) => parts.find((p) => p.type === type).value)
      .join("-");
  };
  return `${format(from)} → ${format(to)}`;
}
function renderControls() {
  const cs = cities(),
    all = events(),
    genres = [
      ...new Set(
        all.flatMap((e) => (e.genres?.length ? e.genres : ["Unknown"])),
      ),
    ].sort(),
    vs = [
      ...new Map(
        all
          .filter((e) => cs.some((c) => c.id === e.metro && c.enabled))
          .map((e) => [e.venue.id, e.venue]),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));
  if (state.venue !== "any" && !vs.some((v) => v.id === state.venue))
    state.venue = "any";
  const counts = savedCounts(all, store.fields);
  const opts = (items, value) =>
    items
      .map(
        ([v, l]) =>
          `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`,
      )
      .join("");
  $("#controls").innerHTML =
    `<div class="mobile-cities">${cs.map((c) => button("toggle-city", `<span class="city-dot" data-city="${esc(c.id)}" style="--city:${esc(c.color)}"></span>${esc(c.short || c.name)}`, "mobile-city", `data-city="${esc(c.id)}" aria-pressed="${c.enabled}"`)).join("")}${icoButton("cities", "plus", "Manage cities")}${icoButton("listening", "spotify", "Your Spotify history")}${icoButton("sources", "info", "Sources")}</div>${state.tab === "saved" ? `<div class="saved-summary"><div class="saved-stat"><strong>${counts.upcoming}</strong><span>upcoming</span></div><div class="saved-stat"><strong>${counts.total}</strong><span>saved in total</span></div><div class="saved-actions"><div class="saved-period">${["upcoming", "past", "all"].map((p) => button("period", p[0].toUpperCase() + p.slice(1), `chip ${state.savedPeriod === p ? "active" : ""}`, `data-period="${p}"`)).join("")}</div>${button("shared-lists", "Shared lists", "small-button")}${button("export", icon("calendar") + "Export", "small-button")}</div></div>` : ""}<div class="date-toolbar"><div class="date-chips">${[
      ["weekend", "This weekend"],
      ["next-weekend", "Next weekend"],
      ["30", "30 days"],
      ["60", "60 days"],
      ["90", "90 days"],
      ["180", "6 months"],
      ["365", "1 year"],
    ]
      .map(([p, l]) => {
        const weekend = p === "weekend" || p === "next-weekend";
        const chip = button(
          "date-preset",
          l,
          `chip ${state.preset === p ? "active" : ""}`,
          `data-preset="${p}" aria-pressed="${state.preset === p}"${weekend ? ` aria-describedby="tooltip-${p}"` : ""}`,
        );
        return weekend
          ? `<span class="weekend-tooltip-wrap ${openWeekendTooltip === p ? "tooltip-open" : ""}">${chip}<span class="weekend-tooltip" id="tooltip-${p}" role="tooltip">${weekendLabel(p)}</span></span>`
          : chip;
      })
      .join(
        "",
      )}</div><div class="date-range">${button("date-range", icon("calendar") + `${dateLabel(state.from)} → ${dateLabel(state.to)}` + icon("down"), "range-trigger", 'aria-label="Choose date range" aria-haspopup="dialog" aria-expanded="false"')}</div></div><div class="search-filter"><label class="searchbox">${icon("search")}<input id="search" type="search" placeholder="Search artists, venues, or notes" aria-label="Search artists, venues, or notes" value="${esc(state.query)}"></label><label class="filter-select"><select id="genre-filter" aria-label="Genre">${opts([["any", "All genres"], ...genres.map((g) => [g, g])], state.genre)}</select></label><label class="filter-select"><select id="venue-filter" aria-label="Venue">${opts([["any", "All venues"], ...vs.map((v) => [v.id, v.name + (v.room ? " · " + v.room : "")])], state.venue)}</select></label><label class="filter-select size-filter">${icon("size")}<select id="size-filter" aria-label="Venue size">${opts(
      SIZE_BUCKETS.map((x) => [x[0], x[1]]),
      state.size,
    )}</select></label></div>`;
  $("#controls").classList.toggle("hidden-view", state.tab === "hidden");
  if (
    state.tab === "hidden" ||
    (state.tab === "saved" && state.savedPeriod !== "upcoming")
  )
    $("#controls .date-toolbar").hidden = true;
}
function sizeDots(v) {
  const max = v.capacity?.max || 0,
    n = !max
      ? 0
      : max < 300
        ? 1
        : max < 1000
          ? 2
          : max < 3000
            ? 3
            : max < 10000
              ? 4
              : 5;
  return `<span class="size-dots" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? "lit" : ""}"></i>`).join("")}</span>`;
}
function hideBtn(e) {
  const hidden = assessment(store.fields, e.id).hidden;
  return icoButton(
    hidden ? "restore" : "hide",
    hidden ? "restore" : "hide",
    (hidden ? "Restore concert: " : "Mark not interested: ") + e.title,
    `data-id="${esc(e.id)}"`,
    "hide-btn",
  );
}
function saveBtn(e) {
  const saved = assessment(store.fields, e.id).saved;
  return icoButton(
    "save",
    "bookmark",
    saved ? "Unsave " + e.title : "Save " + e.title,
    `data-id="${esc(e.id)}" aria-pressed="${saved}"`,
    `save-btn ${saved ? "saved" : ""}`,
  );
}
function venueMapMarkup(e, expanded = false) {
  const v = e.venue,
    city = cityFor(e.metro);
  if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng))
    return '<small class="map-location-unknown">Map location unavailable</small>';
  const canvas = `<div class="${expanded ? "expanded-venue-map" : "mini-venue-map"}" data-venue-map data-lat="${v.lat}" data-lng="${v.lng}" data-city-lat="${city.lat || v.lat}" data-city-lng="${city.lng || v.lng}" aria-label="Map of ${esc(v.name)}"></div>`;
  return expanded
    ? canvas
    : `<div class="venue-map-preview">${canvas}${button("venue-map", "", "expand-venue-map", `data-id="${esc(e.id)}" aria-label="Expand map for ${esc(v.name)}"`)}</div>`;
}
function venueLocationModal(id) {
  const e = eventFor(id);
  if (!e) return;
  const v = e.venue;
  openModal(
    v.name,
    `${venueMapMarkup(e, true)}<p><strong>${esc(v.locality || cityFor(e.metro).name)}</strong><br>${esc(v.address || "Street address unavailable")}</p><p>${esc(capacityLabel(v))}${v.capacity ? " people" : ""}${v.room ? " · " + esc(v.room) : ""}</p><a class="secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name + " " + (v.address || v.locality || ""))}">Open directions ↗</a>`,
    true,
  );
  mountVenueMaps($("#modal-root"), config, true).catch(() => {});
}
function rowTimes(e) {
  const doors = e.doorsTime || (e.timeKind === "doors" ? e.time : null);
  const show = e.showTime || (e.timeKind === "show" ? e.time : null);
  return (
    [
      doors ? `Doors ${timeLabel({ time: doors })}` : "",
      show ? `Show ${timeLabel({ time: show })}` : "",
    ]
      .filter(Boolean)
      .map((t) => `<span>${esc(t)}</span>`)
      .join("") || esc(timeLabel(e))
  );
}
function rowAssessment(a) {
  const scores = ["music", "venue", "visuals"]
    .filter((k) => a[k])
    .map(
      (k) => `<span>${k[0].toUpperCase() + k.slice(1)} <b>${a[k]}/5</b></span>`,
    )
    .join("");
  return scores || a.notes?.trim()
    ? `<div class="row-assessment">${scores ? `<div class="row-scores">${scores}</div>` : ""}${a.notes?.trim() ? `<p class="row-note" title="${esc(a.notes)}">${esc(a.notes)}</p>` : ""}</div>`
    : "";
}
function listeningContext(match) {
  if (!match) return "";
  const reason =
    Number.isFinite(match.plays) && match.plays > 0
      ? `${match.plays.toLocaleString()} plays in your history`
      : match.reason || "In your listening history";
  return `${match.name} · ${reason}`;
}
const historyDetailsKey = () => "concerts.listening-details.v1." + store.active;
function listeningDetailsMarkup(e) {
  let imported;
  try {
    imported = JSON.parse(localStorage.getItem(historyDetailsKey()));
  } catch {}
  const matches = (e.artists || []).filter(
    (a) => listening()?.[normalize(a.name)] || listening()?.[a.spotifyId],
  );
  if (!matches.length) return "";
  const fmt = (value) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Unknown";
  return `<section class="detail-section" id="listening-details"><h3>Your Spotify history</h3>${matches
    .map(({ name }) => {
      const a = imported?.artists?.[normalize(name)];
      if (!a)
        return `<h4>${esc(name)}</h4><p>Re-import your Spotify history on this device to see tracks and dates.</p>${button("listening", "Import history", "secondary")}`;
      const tracks = Object.values(a.tracks).sort((x, y) => y.plays - x.plays);
      const months = Object.entries(a.months).sort(([x], [y]) =>
        x.localeCompare(y),
      );
      const max = Math.max(1, ...months.map(([, n]) => n));
      const thisMonth = new Date().toISOString().slice(0, 7);
      const recent = a.months[thisMonth] || 0;
      return `<h4>${esc(name)}</h4><p>${a.plays.toLocaleString()} plays · ${tracks.length} known songs · ${Math.round(a.ms / 60000).toLocaleString()} minutes</p><p>#${historyRank(a, imported.artists)} by plays in this import</p><p>${recent} plays this month · ${a.plays - a.undated - recent} in earlier months${a.undated ? ` · ${a.undated} undated` : ""}</p><p>First listen: ${fmt(a.first)}<br>Last listen: ${fmt(a.last)}</p><details open><summary>Monthly listening</summary><div class="listening-timeline">${months.map(([month, n]) => `<div title="${month}: ${n} plays"><span>${month}</span><meter min="0" max="${max}" value="${n}">${n}</meter><span>${n}</span></div>`).join("") || "No dated plays available."}</div>${a.undated ? `<p>${a.undated} plays have no date.</p>` : ""}</details><details open><summary>Tracks · most played first</summary><ol class="listening-tracks">${tracks.map((t) => `<li><a href="${t.uri ? "https://open.spotify.com/track/" + t.uri.split(":")[2] : "https://open.spotify.com/search/" + encodeURIComponent(name + " " + t.name)}" target="_blank" rel="noopener">${esc(t.name)}</a><small>${t.plays} plays · ${Math.round(t.ms / 60000)} min</small></li>`).join("") || "Track names unavailable."}</ol></details>`;
    })
    .join(
      "",
    )}${imported ? `<p class="media-notice">Imported history coverage: ${fmt(imported.first)} – ${fmt(imported.last)}. Counts include plays of at least 30 seconds. Track details stay on this device.</p>` : ""}</section>`;
}
function concertLink(id) {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("concert", id);
  return url;
}
function openLinkedConcert() {
  const id = new URL(location.href).searchParams.get("concert");
  if (id && id !== state.selected) {
    if (eventFor(id)) openDetail(id);
    else if (!state.loading)
      toast("This concert is no longer in the current listings.");
  } else if (!id && state.selected) closeDetail();
}
window.addEventListener("popstate", openLinkedConcert);
function eventDateLabel(e) {
  return (
    dateLabel(e.date) +
    (e.endDate && e.endDate !== e.date ? " – " + dateLabel(e.endDate) : "")
  );
}
function row(e) {
  const city = cityFor(e.metro),
    a = assessment(store.fields, e.id),
    match = spotifyMatch(e, listening());
  if (a.hidden)
    return `<article class="event-row hidden-event-row" data-event-id="${esc(e.id)}"><span class="hidden-event-date">${e.date ? dateLabel(e.date, { month: "short", day: "numeric" }) : "TBA"}</span>${button("open", esc(e.title), "hidden-event-title", `data-id="${esc(e.id)}" title="${esc(e.title)}"`)}<span class="hidden-event-venue">${esc(e.venue.name)}</span><span class="hidden-event-label">Not interested</span>${button("restore", icon("restore") + "Restore", "hidden-event-restore", `data-id="${esc(e.id)}" aria-label="Restore ${esc(e.title)}" title="Remove ‘Not interested’ and expand this concert"`)}</article>`;
  return `<article class="event-row${a.saved ? " saved-event-row" : ""}" data-event-id="${esc(e.id)}"><div class="event-date"><span class="day">${e.date ? dateLabel(e.date, { weekday: "short" }) : "TBA"}</span><strong>${e.date ? Number(e.date.slice(8)) : "—"}</strong><span class="time">${e.endDate ? "Through " + dateLabel(e.endDate, { month: "short", day: "numeric" }) : rowTimes(e)}</span></div><div class="event-main">${e.image ? `<img class="event-art" src="${esc(safeURL(e.image))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<div class="event-art fallback" aria-hidden="true">${esc(e.title[0])}</div>`}<div class="event-copy" style="min-width:0">${button("open", esc(e.title), "event-title", `data-id="${esc(e.id)}"`)}${
    e.artists?.length > 1
      ? `<p class="supporting">Lineup: ${esc(
          e.artists
            .slice(0, 4)
            .map((a) => a.name)
            .join(", ") +
            (e.artists.length > 4 ? ` + ${e.artists.length - 4} more` : ""),
        )}</p>`
      : ""
  }<div class="event-tags">${e.eventType === "festival" ? '<span class="genre-tag">Festival</span>' : ""}${
    e.genres
      ?.filter((g) => !/^(unknown|genre unknown)$/i.test(g))
      .slice(0, 2)
      .map((g) => `<span class="genre-tag">${esc(g)}</span>`)
      .join("") || ""
  }${e.status !== "scheduled" ? `<span class="status-tag">${esc(e.status === "soldout" ? "Sold out" : e.status)}</span>` : ""}${match ? `<button class="spotify-tag" data-action="listening-detail" data-id="${esc(e.id)}" title="View listening details">${icon("spotify")}${esc(listeningContext(match))}</button>` : ""}</div>${rowAssessment(a)}${artistContextSlot(e)}</div></div><div class="event-location">${venueMapMarkup(e)}<div class="venue-summary"><span class="venue-name">${esc(e.venue.name)}${e.venue.room ? " · " + esc(e.venue.room) : ""}</span><div class="location-line"><span class="city-dot" data-city="${esc(city.id)}" style="--city:${esc(city.color)}"></span>${esc(e.venue.locality || city.name)} · ${esc(city.short || city.name)}</div><p class="mobile-venue-facts">${esc([e.venue.capacity ? capacityLabel(e.venue) + " capacity" : "", (e.venue.layout || e.venue.capacity?.configuration || "").replace(/;?\s*stage varies/i, "").trim()].filter(Boolean).join(" · "))}</p><div class="capacity">${sizeDots(e.venue)}<span>${esc(capacityLabel(e.venue))}${e.venue.capacity ? " capacity" : ""}</span></div>${e.venue.layout || e.venue.capacity?.configuration ? `<p class="venue-type">${esc(e.venue.layout || e.venue.capacity.configuration)}</p>` : ""}</div></div><div class="event-actions">${saveBtn(e)}${hideBtn(e)}${icoButton("open", "chevron", "View details for " + e.title, `data-id="${esc(e.id)}"`, "details-btn")}</div></article>`;
}
const artistContexts = new Map();
let artistObserver;
function contextMarkup(data, full = false) {
  if (!data?.found) return "";
  const bio = data.bio || data.description;
  const preview =
    bio.length > 220 ? bio.slice(0, 220).replace(/\s+\S*$/, "") + "…" : bio;
  return `<p class="artist-bio-preview">${esc(full ? bio : preview)}</p><p class="artist-facts">${esc(data.facts.join(" · "))}</p>${data.genres.length ? `<p class="artist-facts">Style: ${esc(data.genres.join(" · "))}</p>` : ""}${data.popularity ? `<p class="artist-facts" title="${esc(data.popularity.from)} – ${esc(data.popularity.to)}. Wikipedia readership measures online interest, not listeners or ticket sales.">${Number(data.popularity.views).toLocaleString()} Wikipedia views / 30 days</p>` : ""}${full ? `<div class="artist-background">${data.popularity ? `<p>Wikipedia views measure online interest, not listeners or ticket sales. ${esc(data.popularity.from)} – ${esc(data.popularity.to)}.</p>` : ""}<a href="${esc(safeURL(data.source))}" target="_blank" rel="noopener">Wikidata ↗</a>${data.bioSource ? ` · <a href="${esc(safeURL(data.bioSource))}" target="_blank" rel="noopener">Wikipedia · CC BY-SA ↗</a>` : ""}</div>` : ""}`;
}
function artistContextSlot(e) {
  if (e.eventType === "festival") return "";
  const name = e.artists?.[0]?.name;
  if (!name) return "";
  const data = artistContexts.get(name);
  return `<div class="artist-context" data-artist-context="${esc(name)}">${data ? contextMarkup(data) : '<span class="artist-loading" role="status" aria-label="Loading artist background"><i></i><i></i><i></i></span>'}</div>`;
}
function loadDetailBackground(name) {
  const root = $("#detail-artist-background");
  if (!root || !name) return;
  root.dataset.artistContext = name;
  root.dataset.artistFull = "true";
  const data = artistContexts.get(name);
  root.innerHTML = data
    ? contextMarkup(data, true)
    : '<span class="artist-loading" role="status" aria-label="Loading artist background"><i></i><i></i><i></i></span>';
  if (!data && !artistPending.has(name)) {
    artistPending.add(name);
    artistJobs.unshift(name);
    pumpArtistContexts();
  }
}
const artistJobs = [];
const artistPending = new Set();
let artistActive = 0;
function mountArtistContexts(root) {
  artistObserver?.disconnect();
  artistObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        artistObserver.unobserve(entry.target);
        const name = entry.target.dataset.artistContext;
        if (!artistContexts.has(name) && !artistPending.has(name)) {
          artistPending.add(name);
          artistJobs.push(name);
        }
      }
      pumpArtistContexts();
    },
    { rootMargin: "200px" },
  );
  root
    .querySelectorAll("[data-artist-context]")
    .forEach((el) => artistObserver.observe(el));
}
function pumpArtistContexts() {
  while (artistActive < 2 && artistJobs.length) {
    const name = artistJobs.shift();
    artistActive++;
    apiGet("artist-context", { artist: name })
      .then((data) => {
        artistContexts.set(name, data);
        document.querySelectorAll("[data-artist-context]").forEach((el) => {
          if (el.dataset.artistContext === name)
            el.innerHTML = contextMarkup(
              data,
              el.dataset.artistFull === "true",
            );
        });
      })
      .catch(() => {
        document.querySelectorAll("[data-artist-context]").forEach((el) => {
          if (el.dataset.artistContext === name) el.innerHTML = "";
        });
      })
      .finally(() => {
        artistPending.delete(name);
        artistActive--;
        pumpArtistContexts();
      });
  }
}
function resultsBar(list) {
  const counts = savedCounts(events(), store.fields);
  const label =
    state.tab === "saved"
      ? `Showing ${list.length} of ${state.savedPeriod === "upcoming" ? counts.upcoming + " upcoming" : counts.total} saved`
      : state.tab === "hidden"
        ? `${list.length} hidden ${list.length === 1 ? "concert" : "concerts"} · all dates and cities`
        : list.length + " concerts";
  return `<div class="viewbar ${state.tab === "hidden" ? "hidden-view" : ""}"><div class="results-heading"><div class="results-total"><span class="results-count" aria-live="polite">${state.loading ? "Finding concerts…" : label}</span></div>${button("matches", icon("spotify") + "In Spotify history", `matches-toggle ${state.matches ? "active" : ""}`, `aria-pressed="${state.matches}"`)}</div><div class="viewbar-right">${button("refresh", icon("refresh") + "<span>Refresh</span>", "text-button results-refresh", `aria-label="Refresh concerts" ${state.loading ? "disabled" : ""}`)}<select id="sort" aria-label="Sort concerts" class="sort-select">${[
    ["date", "Date, soonest"],
    ["matches", "Listening matches"],
    ...(state.tab === "saved"
      ? [
          ["saved", "Recently saved"],
          ["music", "Music rating"],
          ["venue", "Venue rating"],
          ["visuals", "Visuals rating"],
        ]
      : []),
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${state.sort === v ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select><select id="mobile-view" class="mobile-view-select" aria-label="Concert view">${[
    ["list", "List"],
    ["calendar", "Calendar"],
    ["venue", "Venues"],
    ["map", "Map"],
  ]
    .map(
      ([value, label]) =>
        `<option value="${value}" ${state.view === value ? "selected" : ""}>${label}</option>`,
    )
    .join("")}</select><div class="view-switch" aria-label="Concert view">${[
    ["list", "list", "List"],
    ["calendar", "calendar", "Calendar"],
    ["venue", "venue", "Venues"],
    ["map", "map", "Map"],
  ]
    .map(([v, i, l]) =>
      button(
        "view",
        icon(i) + `<span>${l}</span>`,
        `view-btn ${state.view === v ? "active" : ""}`,
        `data-view="${v}" aria-label="${l} view" aria-pressed="${state.view === v}" title="${l} view"`,
      ),
    )
    .join("")}</div></div></div>`;
}
function feedNote() {
  return `${state.feed.sourceError ? `<div class="banner">${esc(state.feed.sourceError)}</div>` : ""}${store.data.conflicts?.length ? `<div class="banner">A note was edited on two devices. ${button("conflicts", "Review both versions", "text-button")}</div>` : ""}${state.matches && !Object.keys(listening() || {}).length ? `<div class="banner">Add your listening history to find familiar artists. ${button("listening", "Import Spotify history", "text-button")}</div>` : ""}${state.unmapped ? `<div class="banner">Showing concerts without a verified map location. ${button("clear-unmapped", "Show all concerts", "text-button")}</div>` : ""}`;
}
let lastResultsBody = null;
function renderResults() {
  const list = filtered(),
    root = $("#results");
  if (!root) return;
  let body = "";
  if (state.loading && !events().length)
    body =
      '<div class="load-skeleton">' +
      Array(5).fill('<div class="skeleton-row"></div>').join("") +
      "</div>";
  else if (!list.length) {
    let title =
      state.tab === "saved" && !savedCounts(events(), store.fields).total
        ? "No saved concerts"
        : "No matching concerts";
    let text =
      state.tab === "saved" && !savedCounts(events(), store.fields).total
        ? "Use the bookmark button to save concerts."
        : "Try changing the dates, cities, or filters.";
    if (state.tab === "hidden") {
      title = state.query
        ? "No matching concerts marked not interested."
        : "No concerts marked not interested.";
      text = "Restore concerts to expand them in results.";
    }
    body = `<div class="empty-state">${icon(state.tab === "saved" ? "bookmark" : "music")}<h2>${title}</h2><p>${text}</p>${button(["saved", "hidden"].includes(state.tab) ? "discover" : "reset-filters", ["saved", "hidden"].includes(state.tab) ? "Browse concerts" : "Reset filters", "secondary")}</div>`;
  } else if (state.view === "list") {
    let month = "",
      day = "";
    body =
      '<div class="list-table-header"><span>Date</span><span class="artist-label">Artist & sound</span><span>Venue & size</span><span></span></div>';
    for (const e of list.slice(0, state.limit)) {
      const m = e.date?.slice(0, 7) || "tba";
      if (m !== month) {
        if (month) body += "</div></details>";
        month = m;
        body += `<details class="month-group" data-month="${m}" ${collapsedMonths.has(m) ? "" : "open"}><summary class="month-heading" title="Collapse or expand this month">${m === "tba" ? "Date to be announced" : dateLabel(m + "-01", { month: "long" })} <span>${m === "tba" ? "" : m.slice(0, 4)}</span></summary><div class="month-results">`;
      }
      if (e.date !== day) {
        day = e.date;
        body += `<h3 class="mobile-day-heading">${e.date ? dateLabel(e.date, { weekday: "short", month: "short", day: "numeric" }) : "Date TBA"}</h3>`;
      }
      body += row(e);
    }
    if (month) body += "</div></details>";
    if (list.length > state.limit)
      body += button(
        "more-events",
        `Show more · ${list.length - state.limit} remaining`,
        "show-more",
      );
  } else if (state.view === "calendar") body = calendarView(list);
  else if (state.view === "venue") body = venueView(list);
  else body = mapView(list);
  // Loading and sync notifications should not restart a transition or reload maps.
  const notices = feedNote();
  const signature = state.view + "|" + body;
  if (lastResultsBody === signature && root.querySelector(".results-content")) {
    root.querySelector(".viewbar").outerHTML = resultsBar(list);
    root.querySelector(".results-notices").innerHTML = notices;
    persistUI();
    return;
  }
  const before = captureResults(
    root.querySelector(".results-content"),
    new Set(
      state.view === "list" ? list.slice(0, state.limit).map((e) => e.id) : [],
    ),
  );
  disposeVenueMaps(root);
  if (map) {
    state.mapPosition = { center: map.getCenter(), zoom: map.getZoom() };
    map.remove();
    map = null;
  }
  lastResultsBody = signature;
  root.innerHTML =
    resultsBar(list) +
    `<div class="results-notices">${notices}</div><div class="results-content">${body}</div>`;
  animateResults(root.querySelector(".results-content"), before);
  mountArtistContexts(root);
  if (state.view === "list") mountVenueMaps(root, config).catch(() => {});
  if (state.view === "map" && list.length)
    requestAnimationFrame(() => initializeMap(list));
  persistUI();
}
function calendarView(list) {
  const rangeApplies =
    state.tab !== "hidden" &&
    !(state.tab === "saved" && ["past", "all"].includes(state.savedPeriod));
  const first = state.calendarMonth + "-01",
    d = new Date(first + "T12:00:00Z");
  const start = addDays(first, -d.getUTCDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return `<div class="calendar-header"><h2>${dateLabel(first, { month: "long", year: "numeric" })}</h2><div class="nav">${button("calendar-today", "Today", "text-button")}${icoButton("calendar-prev", "left", "Previous month")}${icoButton("calendar-next", "right", "Next month")}</div></div>${rangeApplies ? `<p class="calendar-range-note">Showing ${dateLabel(state.from)} – ${dateLabel(state.to)}. Shaded dates are outside this range.</p>` : ""}<div class="calendar-grid">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="calendar-weekday">${d}</div>`).join("")}${days
    .map((day) => {
      const excluded = rangeApplies && (day < state.from || day > state.to);
      const dayEvents = excluded
        ? []
        : list.filter((e) => e.date <= day && (e.endDate || e.date) >= day);
      return `<div class="calendar-day ${excluded ? "outside-range" : ""} ${day.slice(0, 7) !== state.calendarMonth ? "outside" : ""} ${day === dayInZone() ? "today" : ""}"><span class="num">${Number(day.slice(8))}</span>${excluded ? '<span class="calendar-excluded-label">Outside range</span>' : ""}${dayEvents
        .slice(0, 3)
        .map((e) =>
          button(
            "open",
            esc(e.title),
            `calendar-event${assessment(store.fields, e.id).hidden ? " not-interested" : ""}`,
            `data-id="${esc(e.id)}" style="--city:${esc(cityFor(e.metro).color)}" title="${esc(e.title + " · " + e.venue.name + (assessment(store.fields, e.id).hidden ? " · Not interested" : ""))}"`,
          ),
        )
        .join(
          "",
        )}${dayEvents.length > 3 ? button("calendar-day", `+${dayEvents.length - 3} more`, "calendar-more", `data-day="${day}"`) : ""}</div>`;
    })
    .join("")}</div>`;
}
function venueDescription(v) {
  const description = v.description || v.layout || v.capacity?.configuration;
  const sources = [
    ...new Set([v.descriptionSource, v.capacity?.source].filter(Boolean)),
  ];
  return `${description ? `<p class="venue-description">${esc(description)}</p>` : ""}${v.capacity?.configuration && v.capacity.configuration !== description ? `<p class="venue-configuration">${esc(v.capacity.configuration)}</p>` : ""}${sources.length ? `<div class="venue-fact-sources">${sources.map((url, i) => `<a href="${esc(safeURL(url))}" target="_blank" rel="noopener">${sources.length > 1 ? (i ? "Capacity source" : "Venue source") : "Source"} ↗</a>`).join(" · ")}</div>` : ""}`;
}

function venueView(list) {
  return `<div class="venue-grid">${groupVenues(list)
    .sort((a, b) => a.venue.name.localeCompare(b.venue.name))
    .map(
      ({ venue: v, events: ev }) =>
        `<article class="venue-card"><div class="location-line"><span class="city-dot" data-city="${esc(v.metro)}" style="--city:${esc(cityFor(v.metro).color)}"></span>${esc(v.locality || cityFor(v.metro).name)}<span style="margin-left:auto">${ev.length} shows</span></div><h3>${esc(v.name)}${v.room ? " · " + esc(v.room) : ""}</h3><div class="capacity">${sizeDots(v)}${esc(capacityLabel(v))}${v.capacity ? " capacity" : ""}</div>${venueDescription(v)}${ev
          .slice(0, 4)
          .map((e) =>
            button(
              "open",
              `<small>${eventDateLabel(e)} · ${esc(timeLabel(e))}</small>${esc(e.title)}${assessment(store.fields, e.id).hidden ? '<span class="interest-label">Not interested</span>' : assessment(store.fields, e.id).saved ? " ♡" : ""}`,
              `event-snippet${assessment(store.fields, e.id).hidden ? " not-interested" : ""}`,
              `data-id="${esc(e.id)}"`,
            ),
          )
          .join(
            "",
          )}${ev.length > 4 ? button("filter-venue", `See all ${ev.length} shows →`, "text-button", `data-venue="${esc(v.id)}"`) : ""}</article>`,
    )
    .join("")}</div>`;
}
function mapView(list) {
  const unmapped = list.filter(
    (e) => !Number.isFinite(e.venue.lat) || !Number.isFinite(e.venue.lng),
  );
  return `<div class="map-toolbar">${button("map-fit", "Fit results", "chip")}${effectiveCities()
    .filter((c) => c.enabled)
    .map((c) =>
      button(
        "map-city",
        esc(c.short || c.name),
        "chip",
        `data-city="${esc(c.id)}"`,
      ),
    )
    .join(
      "",
    )}${unmapped.length ? button("unmapped", `${unmapped.length} without a map location`, "text-button") : ""}</div><div class="map-layout"><div id="concert-map" role="region" aria-label="Concert venue map"></div><aside id="map-selection" class="map-selection"></aside></div>`;
}
function renderMapSelection(list) {
  const group = groupVenues(list).find(
    (g) => g.venue.id === state.mapSelection,
  );
  const el = $("#map-selection");
  if (!el) return;
  if (!group) {
    el.innerHTML = `<p>Select a venue to see concerts.</p><p>Numbers show concert counts; stars mark saved concerts.</p>`;
    return;
  }
  const { venue: v, events: ev } = group;
  el.innerHTML = `<span class="eyebrow">${esc(v.locality)}</span><h3 style="margin:12px 0">${esc(v.name)}${v.room ? " · " + esc(v.room) : ""}</h3><div class="capacity">${sizeDots(v)}${esc(capacityLabel(v))}</div><p style="margin-top:10px">${esc(v.address)}</p>${ev.map((e) => button("open", `<small>${eventDateLabel(e)} · ${esc(timeLabel(e))}</small><b>${esc(e.title)} ${!assessment(store.fields, e.id).hidden && assessment(store.fields, e.id).saved ? "★" : ""}</b>${assessment(store.fields, e.id).hidden ? '<span class="interest-label">Not interested</span>' : ""}`, `event-snippet${assessment(store.fields, e.id).hidden ? " not-interested" : ""}`, `data-id="${esc(e.id)}"`)).join("")}`;
}
async function initializeMap(list) {
  if (!$("#concert-map")) return;
  if (!window.L) {
    $("#concert-map").innerHTML =
      '<p class="map-error">The map could not load. Your concerts are still available in List view.</p>';
    return;
  }
  if (!$("#concert-map") || map) return;
  map = L.map("concert-map", {
    scrollWheelZoom: false,
    zoomControl: true,
    minZoom: 2,
    maxZoom: 19,
  }).setView([39, -98], 4);
  const basemap = addMapboxBasemap(map, config);
  let reportedMapError = false;
  basemap.on("tileerror", () => {
    if (!reportedMapError)
      toast("Some map details could not load. Venue pins remain available.");
    reportedMapError = true;
  });
  markerGroup = L.markerClusterGroup({
    maxClusterRadius: 45,
    showCoverageOnHover: false,
    iconCreateFunction: (cluster) =>
      L.divIcon({
        html: `<div class="map-cluster${cluster.getAllChildMarkers().every((marker) => marker.options.notInterested) ? " not-interested" : ""}">${cluster.getChildCount()}</div>`,
        className: "",
        iconSize: [38, 38],
      }),
  });
  const points = [];
  for (const g of groupVenues(list)) {
    const v = g.venue;
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
    points.push([v.lat, v.lng]);
    const notInterested = g.events.every(
      (e) => assessment(store.fields, e.id).hidden,
    );
    const saved = g.events.some((e) => {
      const a = assessment(store.fields, e.id);
      return a.saved && !a.hidden;
    });
    const marker = L.marker([v.lat, v.lng], {
      notInterested,
      title: `${v.name}: ${g.events.length} concerts${notInterested ? ", not interested" : saved ? ", saved shows" : ""}`,
      icon: L.divIcon({
        className: "",
        html: `<div class="map-pin${notInterested ? " not-interested" : ""}" style="--city:${esc(cityFor(v.metro).color)}"><span>${saved ? "★ " : ""}${g.events.length}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 30],
      }),
    });
    marker.on("click", () => {
      state.mapSelection = v.id;
      renderMapSelection(list);
    });
    markerGroup.addLayer(marker);
  }
  map.addLayer(markerGroup);
  if (state.mapPosition)
    map.setView(state.mapPosition.center, state.mapPosition.zoom);
  else if (points.length)
    map.fitBounds(points, { padding: [38, 38], maxZoom: 13 });
  else map.setView([39, -98], 4);
  map.on("moveend", () => {
    state.mapPosition = { center: map.getCenter(), zoom: map.getZoom() };
  });
  renderMapSelection(list);
}
async function apiGet(action, params = {}) {
  const u = new URL(apiBase, location.href);
  u.searchParams.set("action", action);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { signal: AbortSignal.timeout(22000) });
  let d;
  try {
    d = await r.json();
  } catch {
    throw new Error("Service is not connected.");
  }
  if (!r.ok) throw new Error(d.error || "Service is unavailable.");
  return d;
}
async function loadFeed() {
  const id = ++feedRequest;
  state.loading = true;
  renderResults();
  try {
    const params = {
      from: state.from,
      to: state.to,
      cities: cities()
        .filter((c) => c.enabled)
        .map((c) => c.id)
        .join(","),
    };
    const custom = cities().filter(
      (c) => c.enabled && !DEFAULT_CITIES.some((d) => d.id === c.id),
    );
    if (custom.length) params.custom = JSON.stringify(custom.slice(0, 5));
    const [api, catalog] = await Promise.allSettled([
      apiGet("events", params),
      (async () => {
        const r = await fetch(config.catalogURL || "./data/events.json", {
          cache: "no-cache",
          signal: AbortSignal.timeout(12000),
        });
        if (!r.ok) throw new Error("Catalog unavailable");
        const d = await r.json();
        if (!Array.isArray(d.events) || !Array.isArray(d.sources))
          throw new Error("Invalid catalog");
        return d;
      })(),
    ]);
    if (id !== feedRequest) return;
    state.apiAvailable = api.status === "fulfilled";
    const candidates = [
      state.feed,
      ...[api, catalog]
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value),
    ]
      .filter((f) => f.updatedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!candidates.length)
      throw new Error(
        "Could not load concert listings. Your saved concerts are still here.",
      );
    state.feed = { ...candidates[0] };
    if (api.status === "fulfilled") {
      state.feed.events = mergeEvents([
        ...state.feed.events,
        ...api.value.events.filter((e) =>
          e.sources?.some((s) => s.name === "Ticketmaster"),
        ),
      ]);
      state.feed.sourceError = api.value.sourceError;
    }
  } catch (e) {
    toast(e.message);
  } finally {
    if (id === feedRequest) {
      state.loading = false;
      renderChrome();
      renderControls();
      renderResults();
      openLinkedConcert();
    }
  }
}
const actionHistory = new ActionHistory();
function recordConcertAction(id, label, changes) {
  const a = assessment(store.fields, id);
  actionHistory.record(
    store.active,
    label,
    Object.entries(changes).map(([field, after]) => ({
      key: `event/${id}/${field}`,
      before: a[field],
      after,
      ...(field === "saved" && !a.saved
        ? { guard: { key: `event/${id}/notes`, value: a.notes } }
        : {}),
    })),
  );
}
function undoConcertAction() {
  const read = (key) => {
    const [, id, field] = key.split("/");
    return assessment(store.fields, id)[field];
  };
  const result = actionHistory.undo(store.active, read, (key, value) =>
    store.change(key, value),
  );
  if (!result) return false;
  updateDetailMeta();
  toast(
    result.applied
      ? `Undid ${result.label}.`
      : "This action changed since then and could not be undone.",
  );
  return true;
}
document.addEventListener("keydown", (event) => {
  if (
    !(event.metaKey || event.ctrlKey) ||
    event.altKey ||
    event.shiftKey ||
    event.key.toLowerCase() !== "z" ||
    event.isComposing
  )
    return;
  if (
    event.target.closest?.(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
    )
  )
    return;
  if (undoConcertAction()) event.preventDefault();
});
function saveEvent(e, force) {
  if (!e) return;
  const next = force ?? !assessment(store.fields, e.id).saved;
  recordConcertAction(e.id, next ? "save" : "unsave", { saved: next });
  store.change(`event/${e.id}/snapshot`, e);
  store.change(`event/${e.id}/saved`, next);
  toast(
    next
      ? "Added to your saved concerts."
      : "Removed from saved. Your notes are kept.",
  );
  updateDetailMeta();
}
function setAssessment(id, field, value) {
  const e = eventFor(id);
  if (!e) return;
  if (field !== "notes")
    recordConcertAction(id, `${field} rating`, { [field]: value, saved: true });
  store.change(`event/${id}/snapshot`, e);
  if (!assessment(store.fields, id).saved)
    store.change(`event/${id}/saved`, true);
  store.change(
    `event/${id}/${field}`,
    value,
    field === "notes" ? { baseRev: detailNoteRev } : {},
  );
  updateDetailMeta();
}
function ratingRow(id, key, label, hint) {
  const value = assessment(store.fields, id)[key];
  return `<div class="rating-row"><div><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ""}</div><div class="rating-control" role="group" aria-label="${label} rating">${[1, 2, 3, 4, 5].map((n) => button("rate", n, `rating-score ${value === n ? "selected" : ""}`, `data-id="${esc(id)}" data-field="${key}" data-score="${n}" aria-label="${label}: ${n} out of 5" aria-pressed="${value === n}"`)).join("")}${button("clear-rating", "×", "clear-score", `data-id="${esc(id)}" data-field="${key}" aria-label="Clear ${label.toLowerCase()} rating"`)}</div></div>`;
}
function openDetail(id, listen = false) {
  const e = eventFor(id);
  if (!e) return;
  detailReturnFocus = document.activeElement;
  detailNoteRev = store.fields[`event/${id}/notes`]?.rev || 0;
  state.selected = id;
  if (new URL(location.href).searchParams.get("concert") !== id)
    history.pushState(null, "", concertLink(id));
  state.media = {
    artist: e.artists?.[0]?.name || e.title,
    mode: "live",
    query: "",
    items: [],
    page: 1,
    loading: false,
  };
  const city = cityFor(e.metro),
    a = assessment(store.fields, id),
    match = spotifyMatch(e, listening());
  $("#detail-root").innerHTML =
    `<div class="scrim" data-action="close-detail"></div><section class="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title"><header class="detail-top"><div class="detail-top-meta"><h2 id="detail-title" class="detail-title">${esc(e.title)}</h2><div class="detail-date">${icon("calendar")}${eventDateLabel(e)} · ${esc(timeLabel(e))} · ${esc(e.timezone === "America/Los_Angeles" ? "Pacific time" : e.timezone === "America/New_York" ? "Eastern time" : e.timezone)}</div><div class="detail-venue">${icon("pin")}${esc(e.venue.name)} · ${esc(e.venue.locality || city.name)}</div></div><div class="detail-top-actions">${button("share-concert", "Copy link", "secondary", `data-id="${esc(id)}"`)}${icoButton("close-detail", "close", "Close concert")}</div></header><div class="detail-body"><div id="detail-interest-status">${interestStatusMarkup(id, a.hidden)}</div><div class="event-tags">${match ? `<span class="spotify-tag">${icon("spotify")}${esc(listeningContext(match))}</span>` : ""}${e.status !== "scheduled" ? `<span class="status-tag">${esc(e.status)}</span>` : ""}</div>${e.missingFromFeed ? '<p class="detail-warning">No longer listed by the source. Check for updates.</p>' : ""}<div class="detail-buttons"><a class="primary" href="${esc(safeURL(e.ticketUrl))}" target="_blank" rel="noopener noreferrer">${icon("ticket")}Tickets ${icon("external")}</a>${button("detail-save", icon("bookmark") + `<span class="detail-action-label">${a.saved ? "Saved" : "Save"}</span>`, "secondary", `data-id="${esc(id)}" aria-pressed="${a.saved}" aria-label="Save concert" aria-keyshortcuts="s" title="Toggle saved (S)"`)}${button("hide", icon("hide") + `<span class="detail-action-label">Not interested</span>`, "secondary detail-hide", `data-id="${esc(id)}" aria-label="Mark not interested" aria-keyshortcuts="n" title="Not interested (N)" ${a.hidden ? "hidden" : ""}`)}${icoButton("export-one", "calendar", "Export to calendar", `data-id="${esc(id)}"`, "secondary")}</div><section class="detail-section" id="listen-section">${e.artists?.length > 12 ? `<details class="festival-lineup"><summary>Choose an artist · ${e.artists.length} acts</summary>` : ""}<div class="detail-artist-row"><div class="artist-tabs">${(e.artists?.length ? e.artists : [{ name: e.title }]).map((a, i) => button("artist", esc(a.name), `artist-tab ${i === 0 ? "active" : ""}`, `data-artist="${esc(a.name)}"`)).join("")}</div><div class="detail-genres">${e.genres?.map((g) => `<span class="genre-tag">${esc(g)}</span>`).join("") || ""}</div></div>${e.artists?.length > 12 ? "</details>" : ""}<div id="detail-artist-background" class="detail-artist-background"></div><div id="player" class="player"></div><div class="media-mode">${[
      ["live", "Live performances"],
      ["full", "Full sets"],
      ["all", "All music"],
    ]
      .map(([v, l]) =>
        button(
          "media-mode",
          l,
          v === "live" ? "active" : "",
          `data-mode="${v}"`,
        ),
      )
      .join(
        "",
      )}</div><form id="media-search" class="media-search"><input id="media-query" aria-label="Search recordings" placeholder="Search recordings or paste a YouTube link"><button class="secondary" type="submit" aria-label="Search recordings">${icon("search")}</button></form><div id="media-results"></div></section>${listeningDetailsMarkup(e)}<section class="detail-section"><div class="section-title"><h3>Ratings</h3><small id="detail-sync">${esc(store.status)}</small></div><div id="ratings">${ratingRow(id, "music", "Music", "")}${ratingRow(id, "venue", "Venue", "")}${ratingRow(id, "visuals", "Visuals", "")}</div><details class="concert-notes" ${a.notes?.trim() ? "open" : ""}><summary class="note-label">Notes</summary><textarea aria-label="Notes" id="concert-note" maxlength="30000" data-id="${esc(id)}" placeholder="Add a note">${esc(a.notes)}</textarea></details><p class="media-notice">Adding notes or ratings also bookmarks this concert.</p></section>${venueSection(e)}<section class="detail-section"><div class="eyebrow" style="margin-bottom:12px">Sources</div><div class="source-list">${e.sources?.map((s) => `<a href="${esc(safeURL(s.url))}" target="_blank" rel="noopener">${esc(s.name)} ↗</a>`).join("") || ""}</div></section></div></section>`;
  animateDetail(false);
  $("#app").inert = true;
  document.body.style.overflow = "hidden";
  $(".detail-top button").focus();
  loadMedia();
  loadVenueMedia(e);
  loadDetailBackground(state.media.artist);
  if (listen)
    setTimeout(
      () =>
        $("#listen-section")?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        }),
      80,
    );
}
function venueSection(e) {
  const v = e.venue;
  const rawAddress = v.address || "";
  const address =
    rawAddress.toLowerCase() === v.name.toLowerCase()
      ? ""
      : rawAddress.toLowerCase().startsWith(v.name.toLowerCase() + ",")
        ? rawAddress.slice(v.name.length + 1).trim()
        : rawAddress;
  const directions =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(v.name + " " + (v.address || v.locality || ""));
  return `<section class="detail-section venue-detail"><div class="venue-detail-header"><div><h3>${esc(v.name)}${v.room ? " · " + esc(v.room) : ""}</h3><p>${esc(address || v.locality || "")}</p></div><a class="text-button" href="${esc(directions)}" target="_blank" rel="noopener">${icon("map")}Directions ${icon("external")}</a></div><div class="venue-detail-facts"><span>${esc(capacityLabel(v))}${v.capacity ? " capacity" : ""}</span>${v.layout || v.capacity?.configuration ? `<span>${esc(v.layout || v.capacity.configuration)}</span>` : ""}${v.capacity?.source ? `<a class="source-link" href="${esc(safeURL(v.capacity.source))}" target="_blank" rel="noopener">Capacity source</a>` : ""}</div>${v.description ? `<p class="venue-description">${esc(v.description)}</p>` : ""}<div id="venue-media" aria-live="polite"><p class="media-notice">Loading venue photos and videos…</p></div></section>`;
}
let venueMediaRequest = 0;
async function loadVenueMedia(e) {
  const req = ++venueMediaRequest;
  try {
    const data = await apiGet("venue-media", { venue: e.venue.id });
    if (req !== venueMediaRequest || state.selected !== e.id) return;
    $("#venue-media").innerHTML =
      `<div class="venue-media-label">Photos <small>${esc(data.photoSource)}</small></div>${data.photos.length ? `<div class="venue-photo-grid">${data.photos.map((p) => `<a href="${esc(safeURL(p.url))}" target="_blank" rel="noopener"><img src="${esc(safeURL(p.thumbnail))}" alt="${esc(p.title)}" loading="lazy"><small>${esc(p.title)}</small><small>${esc([p.credit, p.license].filter(Boolean).join(" · "))} · Source ↗</small></a>`).join("")}</div>` : `<p class="media-notice">${data.photosUnavailable ? "Photos unavailable." : "No venue photos found."}</p>`}<div class="venue-media-label">Videos <small>YouTube search results</small></div>${data.videos.length ? `<div class="venue-video-grid">${data.videos.map((v) => `<details class="venue-video" data-video="${esc(v.id)}"><summary><img src="${esc(safeURL(v.thumbnail))}" alt="" loading="lazy"><span>${icon("play")}${esc(v.title)}</span></summary><div class="venue-video-player"></div><a class="source-link" href="${esc(safeURL(v.url))}" target="_blank" rel="noopener">${esc(v.channel)} · YouTube ↗</a></details>`).join("")}</div>` : `<p class="media-notice">${data.videosUnavailable ? "Videos unavailable." : "No venue videos found."}</p>`}`;
    $("#venue-media")
      .querySelectorAll(".venue-video")
      .forEach((el) =>
        el.addEventListener("toggle", () => {
          const player = el.querySelector(".venue-video-player");
          player.innerHTML =
            el.open && /^[a-zA-Z0-9_-]{11}$/.test(el.dataset.video)
              ? `<iframe title="Venue video" src="https://www.youtube-nocookie.com/embed/${el.dataset.video}" allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
              : "";
        }),
      );
  } catch {
    if (req === venueMediaRequest && state.selected === e.id)
      $("#venue-media").innerHTML =
        '<p class="media-notice">Venue photos and videos unavailable.</p>';
  }
}
function interestStatusMarkup(id, hidden) {
  return hidden
    ? `<div class="detail-interest-status"><span>${icon("hide")}Not interested</span>${button("restore", "Undo", "detail-interest-undo", `data-id="${esc(id)}" aria-label="Remove Not interested status" aria-keyshortcuts="n" title="Remove Not interested and expand this concert (N)"`)}</div>`
    : "";
}
function updateDetailMeta() {
  if (!state.selected) return;
  const a = assessment(store.fields, state.selected);
  const note = $("#concert-note");
  if (note && (document.activeElement !== note || note.value === a.notes)) {
    note.value = a.notes;
    detailNoteRev = store.fields[`event/${state.selected}/notes`]?.rev || 0;
  }
  const btn = $('[data-action="detail-save"]');
  if (btn) {
    btn.innerHTML =
      icon("bookmark") +
      `<span class="detail-action-label">${a.saved ? "Saved" : "Save"}</span>`;
    btn.setAttribute("aria-pressed", a.saved);
  }
  const hide = $(".detail-hide");
  if (hide) {
    hide.hidden = a.hidden;
    hide.dataset.action = "hide";
    hide.innerHTML =
      icon("hide") + '<span class="detail-action-label">Not interested</span>';
  }
  const interestStatus = $("#detail-interest-status");
  if (interestStatus)
    interestStatus.innerHTML = interestStatusMarkup(state.selected, a.hidden);
  const status = $("#detail-sync");
  if (status) status.textContent = store.status;
  for (const el of document.querySelectorAll('[data-action="rate"]')) {
    const chosen = a[el.dataset.field] === +el.dataset.score;
    el.classList.toggle("selected", chosen);
    el.setAttribute("aria-pressed", chosen);
  }
}
function animateDetail(closing) {
  const panel = $(".detail-panel"),
    scrim = $("#detail-root .scrim");
  if (
    !panel ||
    !scrim ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return Promise.resolve();
  const transform = getComputedStyle(panel).transform;
  const opacity = getComputedStyle(scrim).opacity;
  for (const el of [panel, scrim])
    el.getAnimations().forEach((a) => a.cancel());
  const options = {
    duration: closing ? 240 : 320,
    easing: closing
      ? "cubic-bezier(.4, 0, 1, 1)"
      : "cubic-bezier(.22, 1, .36, 1)",
    fill: "forwards",
  };
  scrim.animate(
    [{ opacity: closing ? opacity : 0 }, { opacity: closing ? 0 : 1 }],
    options,
  );
  return panel
    .animate(
      [
        { transform: closing ? transform : "translateX(100%)" },
        { transform: closing ? "translateX(100%)" : "translateX(0)" },
      ],
      options,
    )
    .finished.catch(() => {});
}
async function closeDetail() {
  const panel = $(".detail-panel");
  if (!panel || panel.dataset.closing) return;
  panel.dataset.closing = "true";
  mediaRequest++;
  // Stop playback immediately while the panel finishes its exit.
  $("#player")?.replaceChildren();
  await animateDetail(true);
  if (!panel.isConnected) return;
  $("#app").inert = false;
  state.selected = null;
  const url = new URL(location.href);
  url.searchParams.delete("concert");
  history.replaceState(null, "", url);
  $("#detail-root").innerHTML = "";
  document.body.style.overflow = "";
  if (detailReturnFocus?.isConnected)
    detailReturnFocus.focus({ preventScroll: true });
}
function recordingSourceLabel(provider) {
  return (
    { youtube: "YouTube", archive: "Internet Archive" }[provider] ||
    provider ||
    "Unknown source"
  );
}
function renderMedia() {
  const m = state.media,
    root = $("#media-results");
  if (!root) return;
  if (m.loading && !m.items.length) {
    root.innerHTML = '<p class="media-notice">Looking for recordings…</p>';
    return;
  }
  root.innerHTML = `${m.error ? `<p class="media-notice">${esc(m.error)}</p>${button("retry-media", "Try again", "small-button")}` : ""}${!m.items.length && !m.loading ? '<p class="media-notice">No recordings found. Try another search or All music.</p>' : ""}<div class="media-results">${m.items.map((item, i) => button("play-recording", `<img class="media-thumbnail" src="${esc(safeURL(item.thumbnail))}" alt="" loading="lazy"><span><strong>${esc(item.title)}</strong><small class="media-meta"><span class="media-source-badge">${esc(recordingSourceLabel(item.provider))}</span><span>${item.kind === "audio" ? "Audio" : "Video"}${item.channel ? " · " + esc(item.channel) : ""}${item.duration ? " · " + esc(item.duration.replace("PT", "").toLowerCase()) : ""}</span></small></span>`, `media-result ${m.playing === i ? "active" : ""}`, `data-index="${i}"`)).join("")}</div>${m.hasMore ? button("more-media", m.loading ? "Loading…" : "More recordings", "small-button", m.loading ? "disabled" : "") : ""}${m.notice ? `<p class="media-notice">${esc(m.notice)}</p>` : ""}<div class="form-actions"><a class="text-button" href="https://www.youtube.com/results?search_query=${encodeURIComponent(m.artist + " live performance")}" target="_blank" rel="noopener">Search YouTube ${icon("external")}</a><a class="text-button" href="https://open.spotify.com/search/${encodeURIComponent(m.artist)}" target="_blank" rel="noopener">Open Spotify ${icon("external")}</a></div>`;
}
async function loadMedia(more = false) {
  const req = ++mediaRequest,
    m = state.media;
  if (!more) {
    m.items = [];
    m.page = 1;
    m.nextPageToken = "";
    m.playing = null;
    $("#player")?.replaceChildren();
  } else m.page++;
  m.loading = true;
  m.error = null;
  renderMedia();
  try {
    let data;
    try {
      data = await apiGet("media", {
        artist: m.artist,
        mode: m.mode,
        q: m.query,
        page: m.page,
        pageToken: m.nextPageToken || "",
      });
    } catch {
      data = await searchArchive(m.artist, m.mode, m.page, m.query);
    }
    if (req !== mediaRequest) return;
    const seen = new Set(m.items.map((i) => i.provider + ":" + i.id));
    m.items.push(
      ...data.items.filter((i) => !seen.has(i.provider + ":" + i.id)),
    );
    m.hasMore = data.hasMore;
    m.nextPageToken = data.nextPageToken;
    m.provider = data.provider;
    m.notice = data.notice;
  } catch (e) {
    if (req === mediaRequest) m.error = e.message;
  } finally {
    if (req === mediaRequest) {
      m.loading = false;
      renderMedia();
      if (!more && m.items.length) playRecording(0);
    }
  }
}
function playRecording(index) {
  const m = state.media,
    item = m.items[index];
  if (!item) return;
  m.playing = index;
  const embed = safeURL(item.embed);
  if (
    !embed ||
    !["www.youtube-nocookie.com", "archive.org"].includes(
      new URL(embed).hostname,
    )
  )
    return;
  const player = $("#player");
  if (!player) return;
  const entering = !player.hasChildNodes();
  player.innerHTML = `<iframe title="${esc(item.title)}" src="${esc(embed)}${embed.includes("?") ? "&" : "?"}autoplay=1" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="playing-label"><span>${esc(item.title)}</span><a href="${esc(item.url)}" target="_blank" rel="noopener">Can’t play? Open source ↗</a></div>`;
  if (entering && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    player.animate(
      [
        { height: "0px", opacity: 0 },
        { height: `${player.offsetHeight}px`, opacity: 1 },
      ],
      { duration: 280, easing: "ease-out" },
    );
  }
  renderMedia();
}
function openModal(title, body, wide = false) {
  disposeVenueMaps($("#modal-root"));
  $("#app").inert = true;
  $("#detail-root").inert = true;
  modalReturnFocus = document.activeElement;
  $("#modal-root").innerHTML =
    `<div class="scrim modal-scrim" data-action="close-modal"></div><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><h2 id="modal-title">${esc(title)}</h2>${icoButton("close-modal", "close", "Close dialog")}</header><div class="modal-body">${body}</div></section>`;
  document.body.style.overflow = "hidden";
  setTimeout(
    () => $(".modal input:not([type=file]),.modal button")?.focus(),
    0,
  );
}
function closeModal() {
  pendingQRSync = null;
  disposeVenueMaps($("#modal-root"));
  $("#app").inert = !!state.selected;
  $("#detail-root").inert = false;
  $("#modal-root").innerHTML = "";
  document.body.style.overflow = state.selected ? "hidden" : "";
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
}
async function showSyncQR() {
  if (!store.profile || !store.data.code) return;
  const status = await apiGet("status");
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (local && status.storage !== "redis") {
    toast(
      "Open the preview using this computer’s network address to sync another device.",
    );
    return;
  }
  const base = local
    ? "https://devonzuegel.com/concerts/"
    : new URL("./", location.href).href;
  const qr = qrcode(0, "M");
  qr.addData(syncLink(base, store.profile, store.data.code));
  qr.make();
  openModal(
    "Sync another device",
    `<p>Scan with your other device’s camera, then tap Sign in.</p><div class="sync-qr" role="img" aria-label="Private account sign-in QR code">${qr.createSvgTag({ cellSize: 5, margin: 20, scalable: true })}</div><p>Signs in as <strong>${esc(store.profile)}</strong>.</p><p class="media-notice">Keep this QR code private. It grants the same access as your sync code.</p>${local ? '<p class="media-notice">Opens the live site. QR sign-in will work there after this update is deployed.</p>' : ""}`,
  );
}
function receiveSyncQR() {
  if (!pendingQRSync) {
    toast("This sync QR code is invalid. Generate a new one from Account.");
    return;
  }
  openModal(
    "Sign in with QR code",
    `<p>Sign in as <strong>${esc(pendingQRSync.username)}</strong> on this device?</p>${store.profile ? `<p>Currently signed in as ${esc(store.profile)}.</p>` : ""}<div class="form-actions">${button("accept-sync-qr", "Sign in", "primary")}${button("cancel-sync-qr", "Cancel", "secondary")}</div><p id="qr-sync-error" class="form-error" role="alert"></p>`,
  );
}
function profileModal(mode = "create") {
  if (store.profile) {
    openModal(
      "Account",
      `<p>Signed in as <strong>${esc(store.profile)}</strong>. ${esc(store.status)}.</p>${store.lastError ? `<p class="form-error">${esc(store.lastError)}</p>` : ""}<p>Save your sync code to sign in on other devices.</p><label class="form-field">Private sync code<input type="password" value="${esc(store.data.code)}" readonly id="sync-code" aria-label="Private sync code"></label><div class="form-actions">${button("copy-code", "Copy sync code", "primary")}${button("show-code", "Show code", "secondary")}${button("show-sync-qr", "Sync with QR code", "secondary")}${button("sync-now", "Sync now", "secondary")}</div><div class="sidebar-rule"></div><p>Signing out restores your guest list. Pending account changes stay on this device.</p>${button("logout", "Sign out", "secondary")}`,
    );
    return;
  }
  if (state.capabilities.sync === false) {
    openModal(
      "Not signed in",
      "<p>Guest data is saved only in this browser.</p><p>Sync is unavailable. Clearing browser data deletes guest saves.</p>",
    );
    return;
  }
  openModal(
    "Account",
    `<p>Sign in with your username and sync code, or scan a QR code from Account on a signed-in device using your phone’s camera.</p><div class="profile-tabs">${button("profile-create-tab", "Create account", `chip ${mode === "create" ? "active" : ""}`)}${button("profile-login-tab", "Sign in", `chip ${mode === "login" ? "active" : ""}`)}</div><form id="profile-form" data-mode="${mode}"><label class="form-field">Username<input id="profile-name" name="username" autocomplete="username" placeholder="e.g. devon" pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}" minlength="3" maxlength="32" required></label>${mode === "login" ? '<label class="form-field">Private sync code<input id="profile-code" name="code" autocomplete="current-password" type="password" required></label>' : ""}<button type="submit" class="primary">${mode === "create" ? "Create account" : "Sign in"}</button><p id="profile-error" class="form-error" role="alert"></p></form><p class="media-notice">${mode === "create" ? "Guest saves will transfer to your account." : "Guest saves stay on this device and are separate from your account."} ${state.capabilities.storage === "local" ? "This preview syncs devices connected to the same running server." : ""}</p>`,
  );
}
function citiesModal() {
  openModal(
    "Cities",
    `<p>Removing a city keeps its saved concerts.</p><div id="city-settings">${cities()
      .map(
        (c) =>
          `<div class="city-settings-row"><span class="city-dot" data-city="${esc(c.id)}" style="--city:${esc(c.color)}"></span><div><strong>${esc(c.name)}</strong><small>${esc(c.region || "Metro area")}${!DEFAULT_CITIES.some((d) => d.id === c.id) ? ` · <label>Radius <input type="number" min="1" max="200" value="${c.radius}" data-radius-city="${esc(c.id)}" aria-label="Radius in miles for ${esc(c.name)}"> miles</label>` : ""}</small></div>${icoButton("remove-city", "close", "Remove " + c.name, `data-city="${esc(c.id)}"`)}</div>`,
      )
      .join(
        "",
      )}</div><form id="city-search" class="city-search-form"><input id="city-query" placeholder="Search for a city" aria-label="City name" required minlength="2"><button class="primary" type="submit">Find city</button></form><div id="place-results"></div><p class="media-notice">Adding a city does not add event sources. City search: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> / <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a>.</p>`,
  );
}
let placeResults = [];
function listeningImportMarkup(artists) {
  if (!artists.length)
    return "<p>Import listening history to find matching artists.</p>";
  let imported;
  try {
    imported = JSON.parse(localStorage.getItem(historyDetailsKey()));
  } catch {}
  const date = (value) =>
    value && Number.isFinite(+new Date(value))
      ? new Date(value).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Unknown";
  const range = (item) =>
    item.first && item.last
      ? `${date(item.first)} – ${date(item.last)}`
      : "Dates unavailable";
  const number = (value) => Number(value || 0).toLocaleString();
  return `<div class="listening-import-summary"><strong>${icon("check")}Listening history imported</strong><p>${number(artists.length)} artists${imported?.files ? ` · ${number(imported.files.reduce((sum, file) => sum + file.plays, 0))} music plays · ${number(imported.files.length)} files` : ""}</p><p>${imported?.importedAt ? `Last imported ${esc(new Date(imported.importedAt).toLocaleString())}` : "Import date and filenames weren’t recorded for this history. Re-import the files to add them."}</p>${imported?.first ? `<p>Listening dates: ${esc(range(imported))}</p>` : ""}</div>${imported?.files?.length ? `<details class="import-file-details"><summary>Imported files (${number(imported.files.length)})</summary><ul>${imported.files.map((file) => `<li><strong>${esc(file.name)}</strong><span>${esc(file.format)} · ${number(Math.ceil(file.size / 1024))} KB · ${esc(file.type)}</span><span>${number(file.records)} records · ${number(file.plays)} music plays · ${number(file.artists)} artists</span><span>Listening dates: ${esc(range(file))}</span>${file.modifiedAt ? `<span>File modified: ${esc(date(file.modifiedAt))}</span>` : ""}</li>`).join("")}</ul><p class="media-notice">Music plays count listens of at least 30 seconds. File details are stored on this device.</p></details>` : ""}`;
}

function listeningModal() {
  const l = listening() || {},
    artists = [
      ...new Map(Object.values(l).map((a) => [normalize(a.name), a])).values(),
    ].sort((a, b) => b.score - a.score);
  openModal(
    "Spotify listening history",
    `${listeningImportMarkup(artists)}<div class="import-drop">${icon("upload")}<strong>${artists.length ? "Replace imported history" : "Import your Spotify listening history"}</strong>${artists.length ? "" : "<p>No Premium or developer account needed.</p>"}<input id="spotify-import" type="file" accept=".json,application/json" multiple aria-label="Import Spotify streaming-history JSON files"></div><p id="import-status" role="status"></p><p>Request <a href="https://www.spotify.com/account/privacy/" target="_blank" rel="noopener">your Spotify data</a>, then upload the streaming-history JSON files. Only artist play totals sync; track summaries, dates, and file metadata stay on this device. Import non-overlapping files together to avoid counting plays twice. Each import replaces the previous summary.</p>${state.capabilities.spotify ? `<div class="sidebar-rule"></div><p>Connect Spotify for automatic updates.</p><div class="form-actions">${button("connect-spotify", "Connect Spotify", "secondary")}${store.data.spotify ? button("refresh-spotify", "Refresh listening", "secondary") : ""}</div>` : '<p class="media-notice">Automatic Spotify sync is unavailable.</p>'}${artists.length ? `<div class="sidebar-rule"></div>${button("clear-listening", "Remove listening data", "text-button")}` : ""}`,
  );
}
function sourcesModal() {
  const byCity = DEFAULT_CITIES.map((c) => ({
    c,
    sources: state.feed.sources.filter((s) => s.metro === c.id),
  }));
  openModal(
    "The picture so far.",
    `<p>Official venue and festival calendars. Coverage is partial; unavailable sources may have missing events.</p>${state.feed.updatedAt ? `<p>Catalog updated ${new Date(state.feed.updatedAt).toLocaleString()}.</p>` : ""}<table class="source-table"><thead><tr><th class="metro-column">Metro</th><th>Venue / source</th><th>Shows</th><th>Status</th></tr></thead><tbody>${byCity.flatMap(({ c, sources }) => sources.map((s) => `<tr><td class="metro-column">${esc(c.short)}</td><td><a href="${esc(safeURL(s.url))}" target="_blank" rel="noopener">${esc(s.name)} ↗</a><small>${esc(s.message || "Official venue calendar.")}</small></td><td>${s.count || 0}</td><td><span class="source-status ${s.status === "error" ? "error" : ""}">${s.status === "ok" ? "Loaded" : s.status === "error" ? "Unavailable" : "No listings"}</span></td></tr>`)).join("")}</tbody></table><div class="sidebar-rule"></div><p><strong>Broader discovery:</strong> ${state.capabilities.ticketmaster ? "Ticketmaster connected." : "Ticketmaster not connected."}</p><p><strong>Recordings:</strong> ${state.capabilities.youtube ? "YouTube and Internet Archive." : "Internet Archive. YouTube not connected."}</p><p><strong>Maps:</strong> Mapbox / OpenStreetMap. Capacity sources are linked in concert details.</p>`,
    true,
  );
}
function exportOne(e) {
  if (!e.date) {
    toast("This concert does not have a date yet.");
    return;
  }
  if (e.status === "cancelled") {
    toast("This concert is cancelled.");
    return;
  }
  download(calendarICS([e]), `concert-${e.date}.ics`, "text/calendar");
  if (!e.time) toast("Exported as a date-only event; the time is TBA.");
}
function download(contents, name, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function exportModal() {
  const list = events()
    .filter(
      (e) =>
        assessment(store.fields, e.id).saved &&
        !assessment(store.fields, e.id).hidden &&
        isUpcoming(e),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  openModal(
    "Export to calendar",
    `<p>Select concerts to export. Calendar files don’t update automatically and exclude notes.</p>${list.length ? `<label class="check-label"><input type="checkbox" id="export-all" checked>Select all</label><div class="export-list">${list.map((e) => `<label class="export-item"><input type="checkbox" name="export-event" value="${esc(e.id)}" checked><span>${esc(e.title)}<small>${eventDateLabel(e)} · ${esc(e.venue.name)}${!e.time ? " · Time TBA" : ""}</small></span></label>`).join("")}</div>${button("download-selected", "Download calendar file", "primary")}` : "<p>No upcoming saved concerts to export yet.</p>"}`,
  );
}
function conflictsModal() {
  const c = store.data.conflicts?.[0];
  if (!c) {
    toast("All note conflicts are resolved.");
    return;
  }
  const current = valueAt(store.fields, c.key, "");
  openModal(
    "Keep both thoughts.",
    `<p>This note changed on two devices. Choose a version or keep both.</p><strong>Currently synced</strong><div class="conflict-note">${esc(current)}</div><strong>Incoming edit</strong><div class="conflict-note">${esc(c.incoming)}</div><div class="form-actions">${button("resolve-conflict", "Keep synced", "secondary", `data-conflict="${esc(c.id)}" data-choice="existing"`)}${button("resolve-conflict", "Keep incoming", "secondary", `data-conflict="${esc(c.id)}" data-choice="incoming"`)}${button("resolve-conflict", "Keep both", "primary", `data-conflict="${esc(c.id)}" data-choice="both"`)}</div>`,
  );
}
function filtersChanged(refetch = false) {
  state.limit = 60;
  renderControls();
  renderResults();
  if (refetch) loadFeed();
}
function moveCalendar(direction) {
  const d = new Date(state.calendarMonth + "-01T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + direction);
  state.calendarMonth = d.toISOString().slice(0, 7);
  renderResults();
}
function focusTrap(event) {
  if (event.key !== "Tab") return;
  const container = $(".modal") || $(".detail-panel");
  if (!container) return;
  const nodes = [
    ...container.querySelectorAll(
      'button:not([disabled]),a[href],input:not([disabled]),select,textarea,iframe,[tabindex="0"]',
    ),
  ].filter((el) => el.getClientRects().length);
  const first = nodes[0],
    last = nodes.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if ($(".modal")) closeModal();
    else closeDetail();
  }
  focusTrap(e);
});
document.addEventListener("keydown", (event) => {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    $(".modal") ||
    $(".detail-panel")?.dataset.closing ||
    event.target.closest?.(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]',
    )
  )
    return;
  const key = event.key.toLowerCase();
  if (key !== "s" && key !== "n") return;
  // An open panel takes priority over list rows behind its scrim.
  const row = state.selected ? null : $(".event-row[data-event-id]:hover");
  const id = state.selected || row?.dataset.eventId;
  if (!id || !eventFor(id)) return;
  if (key === "n") {
    const hidden = assessment(store.fields, id).hidden;
    const control = row
      ? row.querySelector(`[data-action="${hidden ? "restore" : "hide"}"]`)
      : hidden
        ? $('#detail-interest-status [data-action="restore"]')
        : $(".detail-hide");
    if (control && !control.hidden) {
      event.preventDefault();
      control.click();
    }
  } else if (key === "s") {
    event.preventDefault();
    saveEvent(eventFor(id));
  }
});
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) {
    const row = e.target.closest(".event-row");
    // Ignore controls within the row, not the enclosing month disclosure.
    const control = e.target.closest(
      'a, button, input, select, textarea, details, [role="button"]',
    );
    if (
      row &&
      (!control || !row.contains(control)) &&
      !window.getSelection()?.toString()
    ) {
      openDetail(row.dataset.eventId);
    }
    return;
  }
  if (el.disabled) return;
  const action = el.dataset.action,
    id = el.dataset.id;
  try {
    switch (action) {
      case "venue-map":
        venueLocationModal(id);
        break;
      case "tab":
        state.tab = el.dataset.tab;
        state.sort = "date";
        if (state.tab === "hidden") {
          state.view = "list";
          state.query = "";
          state.limit = 60;
        }
        renderChrome();
        renderControls();
        renderResults();
        break;
      case "discover":
        state.tab = "discover";
        renderChrome();
        renderControls();
        renderResults();
        break;
      case "view":
        state.view = el.dataset.view;
        state.unmapped = false;
        renderResults();
        break;
      case "toggle-city": {
        const c = cities().find((c) => c.id === el.dataset.city);
        if (c) store.change("city/" + c.id, { ...c, enabled: !c.enabled });
        filtersChanged(true);
        break;
      }
      case "cities":
        citiesModal();
        break;
      case "remove-city": {
        const c = cities().find((c) => c.id === el.dataset.city);
        store.change("city/" + c.id, { ...c, followed: false });
        citiesModal();
        filtersChanged();
        break;
      }
      case "add-place": {
        const c = placeResults[+el.dataset.index];
        if (!c) break;
        store.change("city/" + c.id, c);
        citiesModal();
        filtersChanged(true);
        toast(
          "Following " + c.name + ". Coverage depends on connected sources.",
        );
        break;
      }
      case "date-range":
        openRangePicker(
          el,
          { from: state.from, to: state.to },
          ({ from, to }) => {
            state.from = from;
            state.to = to;
            state.preset = "custom";
            state.calendarMonth = from.slice(0, 7);
            filtersChanged(true);
            document.querySelector('[data-action="date-range"]')?.focus();
          },
        );
        break;
      case "date-preset":
        openWeekendTooltip = el.dataset.preset;
        state.preset = el.dataset.preset;
        Object.assign(state, dateRange(state.preset));
        state.calendarMonth = state.from.slice(0, 7);
        filtersChanged(true);
        break;
      case "period":
        state.savedPeriod = el.dataset.period;
        filtersChanged();
        break;
      case "matches":
        state.matches = !state.matches;
        renderResults();
        if (state.matches && !Object.keys(listening() || {}).length)
          listeningModal();
        break;
      case "reset-filters":
        state.query = "";
        state.genre = state.venue = state.size = "any";
        state.matches = false;
        state.unmapped = false;
        state.preset = "60";
        Object.assign(state, dateRange("60"));
        for (const c of cities())
          if (!c.enabled) store.change("city/" + c.id, { ...c, enabled: true });
        filtersChanged(true);
        break;
      case "refresh":
        await loadFeed();
        toast("Concerts updated.");
        break;
      case "more-events":
        state.limit += 60;
        renderResults();
        break;
      case "open":
        openDetail(id);
        break;
      case "listen":
        openDetail(id, true);
        break;
      case "undo-action":
        undoConcertAction();
        break;
      case "hide":
      case "restore": {
        const event = eventFor(id);
        if (!event) break;
        const hidden = action === "hide";
        recordConcertAction(id, hidden ? "marking not interested" : "restore", {
          hidden,
        });
        store.change(`event/${id}/snapshot`, event);
        store.change(`event/${id}/hidden`, hidden);
        if (hidden && state.selected === id) await closeDetail();
        toast(
          hidden
            ? "Marked not interested."
            : "Concert restored. Your bookmarks and notes are kept.",
          hidden ? button("undo-action", "Undo", "toast-undo") : "",
        );
        break;
      }
      case "save":
        saveEvent(eventFor(id));
        break;
      case "detail-save":
        saveEvent(eventFor(id));
        break;
      case "close-detail":
        closeDetail();
        break;
      case "rate":
        setAssessment(id, el.dataset.field, +el.dataset.score);
        break;
      case "clear-rating":
        setAssessment(id, el.dataset.field, null);
        break;
      case "artist":
        state.media.artist = el.dataset.artist;
        loadDetailBackground(state.media.artist);
        state.media.query = "";
        document
          .querySelectorAll(".artist-tab")
          .forEach((b) => b.classList.toggle("active", b === el));
        $("#media-query").value = "";
        $("#media-query").placeholder =
          "Search recordings or paste a YouTube link";
        await loadMedia();
        break;
      case "media-mode":
        state.media.mode = el.dataset.mode;
        document
          .querySelectorAll(".media-mode button")
          .forEach((b) => b.classList.toggle("active", b === el));
        await loadMedia();
        break;
      case "more-media":
        await loadMedia(true);
        break;
      case "retry-media":
        await loadMedia();
        break;
      case "play-recording":
        playRecording(+el.dataset.index);
        break;
      case "calendar-prev":
        moveCalendar(-1);
        break;
      case "calendar-next":
        moveCalendar(1);
        break;
      case "calendar-today":
        state.calendarMonth = dayInZone().slice(0, 7);
        moveCalendar(0);
        break;
      case "calendar-day": {
        const list = filtered().filter(
          (e) =>
            e.date <= el.dataset.day && (e.endDate || e.date) >= el.dataset.day,
        );
        openModal(
          dateLabel(el.dataset.day),
          `<div class="day-modal-events">${list.map((e) => button("modal-open-concert", esc(e.title) + `<small>${esc(timeLabel(e))} · ${esc(e.venue.name)} · ${esc(cityFor(e.metro).short)}</small>`, "", `data-id="${esc(e.id)}"`)).join("")}</div>`,
        );
        break;
      }
      case "modal-open-concert":
        closeModal();
        openDetail(id);
        break;
      case "filter-venue":
        state.venue = el.dataset.venue;
        state.view = "list";
        filtersChanged();
        break;
      case "map-fit":
        if (markerGroup?.getLayers().length)
          map.fitBounds(markerGroup.getBounds(), {
            padding: [35, 35],
            maxZoom: 13,
          });
        break;
      case "map-city": {
        const c = effectiveCities().find((c) => c.id === el.dataset.city);
        if (c && map) map.setView([c.lat, c.lng], 10);
        break;
      }
      case "unmapped":
        state.unmapped = true;
        state.view = "list";
        renderResults();
        break;
      case "clear-unmapped":
        state.unmapped = false;
        renderResults();
        break;
      case "show-sync-qr":
        await showSyncQR();
        break;
      case "cancel-sync-qr":
        pendingQRSync = null;
        closeModal();
        break;
      case "accept-sync-qr":
        if (!pendingQRSync) break;
        el.disabled = true;
        try {
          await store.login(pendingQRSync.username, pendingQRSync.code);
          pendingQRSync = null;
          closeModal();
          renderChrome();
          renderControls();
          renderResults();
          toast("Signed in. Your concerts are synced.");
        } catch (error) {
          $("#qr-sync-error").textContent = error.message;
          el.disabled = false;
        }
        break;
      case "profile":
        profileModal();
        break;
      case "profile-create-tab":
        profileModal("create");
        break;
      case "profile-login-tab":
        profileModal("login");
        break;
      case "copy-code":
        await navigator.clipboard.writeText(store.data.code);
        toast("Sync code copied.");
        break;
      case "show-code":
        $("#sync-code").type =
          $("#sync-code").type === "password" ? "text" : "password";
        el.textContent =
          $("#sync-code").type === "password" ? "Show code" : "Hide code";
        break;
      case "sync-now":
        await store.sync();
        profileModal();
        break;
      case "logout":
        store.logout();
        closeModal();
        renderControls();
        renderResults();
        toast("Signed out.");
        break;
      case "sources":
        sourcesModal();
        break;
      case "listening":
        listeningModal();
        break;
      case "connect-spotify":
        if (!store.profile) {
          profileModal();
          break;
        }
        el.disabled = true;
        location.href = (await store.apiCall("spotify-start", {})).url;
        break;
      case "refresh-spotify":
        el.disabled = true;
        await store.apiCall("spotify-refresh", {});
        await store.sync();
        listeningModal();
        toast("Listening updated.");
        break;
      case "share-concert":
        await navigator.clipboard.writeText(concertLink(id).href);
        toast("Concert link copied.");
        break;
      case "listening-detail":
        openDetail(id);
        $("#listening-details")?.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
        break;
      case "clear-listening":
        localStorage.removeItem(historyDetailsKey());
        if (store.data.spotify) await store.apiCall("spotify-disconnect", {});
        store.change("listening", null);
        closeModal();
        toast("Listening data removed.");
        break;
      case "shared-lists":
        await manageLists({
          store,
          concerts: events().filter(
            (e) => assessment(store.fields, e.id).saved,
          ),
          openModal,
        });
        break;
      case "export":
        exportModal();
        break;
      case "export-one":
        exportOne(eventFor(id));
        break;
      case "download-selected": {
        const ids = [
          ...document.querySelectorAll('[name="export-event"]:checked'),
        ].map((e) => e.value);
        const list = events().filter((e) => ids.includes(e.id));
        if (!list.length) {
          toast("Choose at least one concert.");
          break;
        }
        download(
          calendarICS(list),
          "concert-tracker-saved-concerts.ics",
          "text/calendar",
        );
        closeModal();
        toast(`Exported ${list.length} concerts.`);
        break;
      }
      case "conflicts":
        conflictsModal();
        break;
      case "resolve-conflict": {
        const c = store.data.conflicts.find(
          (c) => c.id === el.dataset.conflict,
        );
        if (!c) break;
        const current = valueAt(store.fields, c.key, "");
        const value =
          el.dataset.choice === "existing"
            ? current
            : el.dataset.choice === "incoming"
              ? c.incoming
              : current + "\n\n— Other device —\n" + c.incoming;
        store.change(c.key, value);
        store.change("conflict/" + c.id, null);
        el.disabled = true;
        await store.sync();
        closeModal();
        toast("Note versions resolved.");
        break;
      }
      case "close-modal":
        closeModal();
        break;
    }
  } catch (error) {
    toast(error.message || "Something went wrong.");
    el.disabled = false;
  }
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "search") {
    state.query = el.value;
    state.limit = 60;
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderResults, 160);
  }
  if (el.id === "concert-note") setAssessment(el.dataset.id, "notes", el.value);
});
document.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.id === "genre-filter") {
    state.genre = el.value;
    renderResults();
  }
  if (el.id === "venue-filter") {
    state.venue = el.value;
    renderResults();
  }
  if (el.id === "size-filter") {
    state.size = el.value;
    renderResults();
  }
  if (el.id === "mobile-view") {
    state.view = el.value;
    state.unmapped = false;
    renderResults();
  }
  if (el.id === "sort") {
    state.sort = el.value;
    renderResults();
  }
  if (el.dataset.radiusCity) {
    const c = cities().find((c) => c.id === el.dataset.radiusCity),
      radius = Number(el.value);
    if (radius < 1 || radius > 200) {
      toast("Choose a radius between 1 and 200 miles.");
      return;
    }
    store.change("city/" + c.id, { ...c, radius });
    filtersChanged(true);
  }
  if (el.id === "export-all")
    document
      .querySelectorAll('[name="export-event"]')
      .forEach((c) => (c.checked = el.checked));
  if (el.id === "spotify-import") {
    const status = $("#import-status");
    status.textContent = "Reading your listening history…";
    try {
      const combined = {};
      let detailed = { artists: {}, first: null, last: null, files: [] };
      let plays = 0;
      for (const file of el.files) {
        if (file.size > 150 * 1024 * 1024)
          throw new Error("Choose JSON files smaller than 150 MB each.");
        const doc = JSON.parse(await file.text());
        const data = importSpotifyHistory(doc);
        detailed.files.push(importFileMetadata(file, doc, data));
        addHistoryDetails(doc, detailed);
        plays += data.count;
        for (const [key, a] of Object.entries(data.artists)) {
          if (!combined[key]) combined[key] = { ...a };
          else {
            combined[key].plays += a.plays;
            combined[key].minutes += a.minutes;
            combined[key].score = combined[key].minutes;
          }
        }
      }
      for (const a of Object.values(combined))
        a.reason = `${a.plays.toLocaleString()} plays in your import`;
      if (!plays)
        throw new Error(
          "No music plays found. Choose streaming-history files containing artist names and listening durations.",
        );
      detailed.importedAt = new Date().toISOString();
      localStorage.setItem(historyDetailsKey(), JSON.stringify(detailed));
      store.change("listening", combined);
      listeningModal();
      toast(
        `Imported ${plays.toLocaleString()} plays across ${Object.keys(combined).length} artists.`,
      );
    } catch (error) {
      status.textContent = error.message;
      status.className = "form-error";
    }
  }
});
document.addEventListener("submit", async (e) => {
  const form = e.target;
  if (!["profile-form", "city-search", "media-search"].includes(form.id))
    return;
  e.preventDefault();
  const submit = form.querySelector("[type=submit]");
  submit.disabled = true;
  try {
    if (form.id === "profile-form") {
      const name = $("#profile-name").value;
      if (form.dataset.mode === "create") {
        const code = await store.create(name);
        profileModal();
        $("#sync-code").type = "text";
        toast(
          "Your account is ready. Keep your sync code to sign in on other devices.",
        );
      } else {
        await store.login(name, $("#profile-code").value);
        closeModal();
        toast("Signed in.");
      }
      renderChrome();
      renderControls();
      renderResults();
    }
    if (form.id === "city-search") {
      const q = $("#city-query").value;
      $("#place-results").textContent = "Finding cities…";
      let d;
      try {
        d = await apiGet("places", { q });
      } catch {
        const r = await fetch(
          "https://geocoding-api.open-meteo.com/v1/search?" +
            new URLSearchParams({
              name: q,
              count: 8,
              language: "en",
              format: "json",
            }),
        );
        if (!r.ok) throw new Error("City search is unavailable. Try again.");
        const result = await r.json();
        d = {
          places: (result.results || []).map((p) => ({
            id: "place-" + p.id,
            name: p.name,
            region: [p.admin1, p.country].filter(Boolean).join(", "),
            lat: p.latitude,
            lng: p.longitude,
            radius: 40,
            timezone: p.timezone,
            short: p.name.slice(0, 3).toUpperCase(),
            color: "#7d8561",
            enabled: true,
          })),
        };
      }
      placeResults = d.places;
      $("#place-results").innerHTML = placeResults.length
        ? placeResults
            .map((p, i) =>
              button(
                "add-place",
                esc(p.name) + `<small>${esc(p.region)}</small>`,
                "place-result",
                `data-index="${i}"`,
              ),
            )
            .join("")
        : "<p>No matching cities. Try a different spelling.</p>";
    }
    if (form.id === "media-search") {
      const query = $("#media-query").value,
        id = youtubeVideoID(query);
      if (id) {
        mediaRequest++;
        state.media.loading = false;
        state.media.items.unshift({
          id,
          title: state.media.artist + " — YouTube recording",
          embed: "https://www.youtube-nocookie.com/embed/" + id,
          url: "https://www.youtube.com/watch?v=" + id,
          provider: "youtube",
          kind: "video",
          thumbnail: "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg",
        });
        playRecording(0);
      } else {
        state.media.query = query;
        await loadMedia();
      }
    }
  } catch (error) {
    const target =
      form.id === "profile-form"
        ? $("#profile-error")
        : form.id === "city-search"
          ? $("#place-results")
          : null;
    if (target) target.textContent = error.message;
    else toast(error.message);
  } finally {
    submit.disabled = false;
  }
});
store.addEventListener("change", () => {
  actionHistory.scope(store.active);
  renderChrome();
  const counts = savedCounts(events(), store.fields);
  const stats = document.querySelectorAll(".saved-stat strong");
  if (stats[0]) stats[0].textContent = counts.upcoming;
  if (stats[1]) stats[1].textContent = counts.total;
  renderResults();
  updateDetailMeta();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) store.sync();
});
window.addEventListener("online", () => store.sync());
window.addEventListener("focus", () => store.sync());
setInterval(() => {
  if (!document.hidden) store.sync();
}, 8000);
shell();
if (hadQRSync) receiveSyncQR();
try {
  const r = await fetch("./data/events.json");
  if (r.ok) {
    state.feed = await r.json();
    state.loading = false;
    renderChrome();
    renderControls();
    renderResults();
  }
} catch {}
loadFeed();
apiGet("status")
  .then((d) => (state.capabilities = d))
  .catch(() => {
    state.capabilities.sync = false;
  });
store.sync();
const returnedSpotify = new URLSearchParams(location.search).get("spotify");
if (returnedSpotify) {
  toast(
    returnedSpotify === "connected"
      ? "Spotify connected. Your listening is ready."
      : "Spotify could not connect. You can still import your listening history.",
  );
  history.replaceState(null, "", location.pathname);
}

function dismissWeekendTooltips() {
  openWeekendTooltip = null;
  document.querySelectorAll(".weekend-tooltip-wrap").forEach((el) => {
    el.classList.remove("tooltip-open");
    el.classList.add("tooltip-dismissed");
  });
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".weekend-tooltip-wrap")) dismissWeekendTooltips();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") dismissWeekendTooltips();
});
for (const event of ["pointerover", "focusin"])
  document.addEventListener(event, (e) => {
    const wrap = e.target.closest(".weekend-tooltip-wrap");
    if (wrap && !wrap.contains(e.relatedTarget))
      wrap.classList.remove("tooltip-dismissed");
  });

// Native disclosure controls retain keyboard support and preserve their state
// when filters, saves, or additional results rerender the list.
document.addEventListener(
  "toggle",
  (event) => {
    const group = event.target;
    if (!group.matches?.("details.month-group")) return;
    if (group.open) collapsedMonths.delete(group.dataset.month);
    else collapsedMonths.add(group.dataset.month);
  },
  true,
);

const monthAnimations = new WeakMap();
document.addEventListener("click", (event) => {
  const heading = event.target.closest("summary.month-heading");
  if (!heading) return;
  event.preventDefault();
  const group = heading.parentElement;
  const content = group.querySelector(".month-results");
  const previous = monthAnimations.get(group);
  const expand = previous ? !previous.expand : !group.open;
  const startHeight = group.open ? content.getBoundingClientRect().height : 0;
  previous?.animation.cancel();
  const finish = () => {
    group.open = expand;
    delete group.dataset.expanding;
    content.style.overflow = "";
    if (expand) collapsedMonths.delete(group.dataset.month);
    else collapsedMonths.add(group.dataset.month);
    monthAnimations.delete(group);
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finish();
    return;
  }
  group.open = true;
  group.dataset.expanding = String(expand);
  content.style.overflow = "hidden";
  const animation = content.animate(
    [
      { height: `${startHeight}px` },
      { height: `${expand ? content.scrollHeight : 0}px` },
    ],
    { duration: 320, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" },
  );
  monthAnimations.set(group, { animation, expand });
  animation.finished
    .then(() => {
      if (monthAnimations.get(group)?.animation !== animation) return;
      finish();
      animation.cancel();
    })
    .catch(() => {});
});
