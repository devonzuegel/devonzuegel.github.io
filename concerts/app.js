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
} from "./shared/core.js";
import { ClientStore } from "./shared/client-store.js";
import { searchArchive } from "./shared/archive.js";
const config = window.CONCERTS_CONFIG || {},
  apiBase = config.apiBase || "/api/concerts";
const store = new ClientStore(apiBase);
const icons = {
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
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 4200);
}
const events = () => allEvents(state.feed.events, store.fields);
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
    { ...state, cities: effectiveCities() },
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
    `<div class="layout"><aside class="sidebar" aria-label="Concert notebook navigation"><a class="wordmark" href="./">encore<span>✳</span></a><div class="tagline">A concert notebook</div><div id="sidebar-content"></div><div class="sidebar-bottom" id="sidebar-bottom"></div></aside><main id="main" class="main"><div id="mobile-header"></div><div class="topline"><span class="today-label">${dateLabel(dayInZone(), { weekday: "long", month: "long", day: "numeric" })}</span><div class="utility">${button("sources", icon("info") + " Sources", "text-button")}${button("refresh", icon("refresh") + " Refresh", "text-button")}</div></div><div id="controls"></div><div id="results"></div></main></div>`;
  renderChrome();
  renderControls();
  renderResults();
}
function navMarkup(mobile = false) {
  const count = savedCounts(events(), store.fields);
  return `<div class="${mobile ? "mobile-nav" : "main-nav"}">${button("tab", icon("explore") + "Discover", `nav-btn ${state.tab === "discover" ? "active" : ""}`, 'data-tab="discover"')}${button("tab", icon("bookmark") + 'Saved <span class="badge">' + count.upcoming + "</span>", `nav-btn ${state.tab === "saved" ? "active" : ""}`, 'data-tab="saved"')}${mobile ? icoButton("profile", "user", "Your profile") : ""}</div>`;
}
function renderChrome() {
  const account = button(
    "profile",
    `${icon("user")}<span><small>${store.profile ? "Signed in as" : "Not signed in"}</small><strong>${esc(store.profile || "Guest notebook")}</strong></span>`,
    "account-button",
    `aria-label="${esc(store.profile ? "Signed in as " + store.profile : "Not signed in. Open account options")}"`,
  );
  let accountSlot = $("#account-slot");
  if (!accountSlot) {
    accountSlot = document.createElement("div");
    accountSlot.id = "account-slot";
    $(".utility").append(accountSlot);
  }
  accountSlot.innerHTML = account;
  const c = cities();
  $("#sidebar-content").innerHTML =
    navMarkup() +
    `<div class="sidebar-rule"></div><div class="sidebar-head"><span class="eyebrow">Your cities</span>${icoButton("cities", "plus", "Manage cities", "", "icon-btn small")}</div><div class="city-list">${c.map((city) => `<button class="city-toggle" data-action="toggle-city" data-city="${esc(city.id)}" aria-pressed="${city.enabled}" style="--city:${esc(city.color)}"><span class="city-dot"></span>${esc(city.name)}<span class="city-check">${city.enabled ? icon("check") : ""}</span></button>`).join("")}</div>${button("cities", icon("plus") + "Add a city", "subtle-btn")}<div class="listening-box"><span class="eyebrow">A familiar sound</span><p>${Object.keys(listening() || {}).length ? "Find shows by artists in your listening history." : "Bring your listening history. Find artists you already love."}</p>${button("listening", icon("spotify") + (Object.keys(listening() || {}).length ? "Your listening" : "Add your listening"), "small-button")}</div>`;
  $("#sidebar-bottom").innerHTML =
    `${button("profile", `<span class="avatar">${esc((store.profile || "D").slice(0, 1).toUpperCase())}</span><span class="profile-text"><strong>${esc(store.profile || "Your notebook")}</strong><small title="${esc(store.lastError)}">${esc(store.status)}</small></span>${icon("down")}`, "profile-btn")}<a class="site-link" href="/">← Back to devonzuegel.com</a>`;
  $("#mobile-header").innerHTML =
    `<div class="mobile-brand"><div class="mobile-account-row"><a class="wordmark" href="./">encore<span>✳</span></a>${account}</div>${navMarkup(true)}</div>`;
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
    `<div class="mobile-cities">${cs.map((c) => button("toggle-city", `<span class="city-dot" style="--city:${esc(c.color)}"></span>${esc(c.short || c.name)}`, "mobile-city", `data-city="${esc(c.id)}" aria-pressed="${c.enabled}"`)).join("")}${icoButton("cities", "plus", "Manage cities")}${icoButton("listening", "spotify", "Your listening")}</div>${state.tab === "saved" ? `<div class="saved-summary"><div class="saved-stat"><strong>${counts.upcoming}</strong><span>upcoming</span></div><div class="saved-stat"><strong>${counts.total}</strong><span>saved in total</span></div><div class="saved-actions"><div class="saved-period">${["upcoming", "past", "all"].map((p) => button("period", p[0].toUpperCase() + p.slice(1), `chip ${state.savedPeriod === p ? "active" : ""}`, `data-period="${p}"`)).join("")}</div>${button("export", icon("calendar") + "Export", "small-button")}</div></div>` : ""}<div class="date-toolbar"><span class="date-label">${icon("calendar")}When</span><div class="date-chips">${[
      ["weekend", "This weekend"],
      ["30", "30 days"],
      ["60", "60 days"],
      ["90", "90 days"],
      ["180", "6 months"],
      ["365", "1 year"],
    ]
      .map(([p, l]) =>
        button(
          "date-preset",
          l,
          `chip ${state.preset === p ? "active" : ""}`,
          `data-preset="${p}"`,
        ),
      )
      .join(
        "",
      )}</div><div class="date-range"><input type="date" id="date-from" aria-label="From date" value="${state.from}"><span>—</span><input type="date" id="date-to" aria-label="To date" value="${state.to}"></div></div><div class="search-filter"><label class="searchbox">${icon("search")}<input id="search" type="search" placeholder="Search artists, venues, or notes" aria-label="Search artists, venues, or notes" value="${esc(state.query)}"></label><label class="filter-select"><select id="genre-filter" aria-label="Genre">${opts([["any", "All genres"], ...genres.map((g) => [g, g])], state.genre)}</select></label><label class="filter-select"><select id="venue-filter" aria-label="Venue">${opts([["any", "All venues"], ...vs.map((v) => [v.id, v.name + (v.room ? " · " + v.room : "")])], state.venue)}</select></label><label class="filter-select size-filter">${icon("size")}<select id="size-filter" aria-label="Venue size">${opts(
      SIZE_BUCKETS.map((x) => [x[0], x[1]]),
      state.size,
    )}</select></label></div>`;
  if (state.tab === "saved" && state.savedPeriod !== "upcoming")
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
function row(e) {
  const city = cityFor(e.metro),
    a = assessment(store.fields, e.id),
    match = spotifyMatch(e, listening());
  return `<article class="event-row" data-event-id="${esc(e.id)}"><div class="event-date"><span class="day">${e.date ? dateLabel(e.date, { weekday: "short" }) : "TBA"}</span><strong>${e.date ? Number(e.date.slice(8)) : "—"}</strong><span class="time">${esc(timeLabel(e))}</span></div><div class="event-main">${e.image ? `<img class="event-art" src="${esc(safeURL(e.image))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<div class="event-art fallback" aria-hidden="true">${esc(e.title[0])}</div>`}<div style="min-width:0">${button("open", esc(e.title), "event-title", `data-id="${esc(e.id)}"`)}${
    e.artists?.length > 1
      ? `<p class="supporting">with ${esc(
          e.artists
            .slice(1)
            .map((a) => a.name)
            .join(", "),
        )}</p>`
      : ""
  }<div class="event-tags">${
    e.genres
      ?.slice(0, 2)
      .map((g) => `<span class="genre-tag">${esc(g)}</span>`)
      .join("") || '<span class="genre-tag">Genre unknown</span>'
  }${e.status !== "scheduled" ? `<span class="status-tag">${esc(e.status === "soldout" ? "Sold out" : e.status)}</span>` : ""}${match ? `<span class="spotify-tag" title="${esc(match.name + ": " + match.reason)}">${icon("spotify")}You listen to this</span>` : ""}</div></div></div><div class="event-location"><span class="venue-name">${esc(e.venue.name)}${e.venue.room ? " · " + esc(e.venue.room) : ""}</span><div class="location-line"><span class="city-dot" style="--city:${esc(city.color)}"></span>${esc(e.venue.locality || city.name)} · ${esc(city.short || city.name)}</div><div class="capacity">${sizeDots(e.venue)}<span>${esc(capacityLabel(e.venue))}${e.venue.capacity ? " capacity" : ""}</span></div></div><div class="event-actions">${saveBtn(e)}${icoButton("listen", "play", "Sample " + e.artists?.[0]?.name, `data-id="${esc(e.id)}"`, "listen-btn")}</div>${
    state.tab === "saved" && (a.notes || a.music || a.venue || a.visuals)
      ? `<div class="inline-assessment">${["music", "venue", "visuals"]
          .filter((k) => a[k])
          .map(
            (k) =>
              `<span>${k[0].toUpperCase() + k.slice(1)} <span class="mini-score">${a[k]}/5</span></span>`,
          )
          .join("")}${a.notes ? `<p>${esc(a.notes)}</p>` : ""}</div>`
      : ""
  }</article>`;
}
function resultsBar(list) {
  const counts = savedCounts(events(), store.fields);
  const label =
    state.tab === "saved"
      ? `Showing ${list.length} of ${state.savedPeriod === "upcoming" ? counts.upcoming + " upcoming" : counts.total} saved`
      : list.length + " concerts";
  return `<div class="viewbar"><div class="results-heading"><span class="results-count" aria-live="polite">${state.loading ? "Finding concerts…" : label}</span>${button("matches", icon("spotify") + "Listening matches", `matches-toggle ${state.matches ? "active" : ""}`, `aria-pressed="${state.matches}"`)}</div><div class="viewbar-right"><select id="sort" aria-label="Sort concerts" class="sort-select">${[
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
  const updated = state.feed.updatedAt ? new Date(state.feed.updatedAt) : null;
  const age = updated ? (Date.now() - updated) / 3600000 : Infinity;
  return `<div class="feed-note"><span class="status-dot"></span><span>Official venue calendars${updated ? " · updated " + new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(updated) : ""} · Coverage is partial. ${button("sources", "See sources and gaps", "")}${age > 36 ? " · Listings may be out of date." : ""}</span></div>${state.feed.sourceError ? `<div class="banner">${esc(state.feed.sourceError)}</div>` : ""}${store.data.conflicts?.length ? `<div class="banner">A note was edited on two devices. ${button("conflicts", "Review both versions", "text-button")}</div>` : ""}${state.matches && !Object.keys(listening() || {}).length ? `<div class="banner">Add your listening history to find familiar artists. ${button("listening", "Import Spotify history", "text-button")}</div>` : ""}${state.unmapped ? `<div class="banner">Showing concerts without a verified map location. ${button("clear-unmapped", "Show all concerts", "text-button")}</div>` : ""}`;
}
function renderResults() {
  if (map) {
    state.mapPosition = { center: map.getCenter(), zoom: map.getZoom() };
    map.remove();
    map = null;
  }
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
        ? "Your next good night starts here."
        : "No shows in this view.";
    let text =
      state.tab === "saved" && !savedCounts(events(), store.fields).total
        ? "Save a concert with the bookmark button. Your notes, ratings, and plans will have a home here."
        : "Try a wider date range, another city, or fewer filters. Venue calendars are only part of the picture.";
    body = `<div class="empty-state">${icon(state.tab === "saved" ? "bookmark" : "music")}<h2>${title}</h2><p>${text}</p>${button(state.tab === "saved" ? "discover" : "reset-filters", state.tab === "saved" ? "Explore concerts" : "Reset filters", "secondary")}</div>`;
  } else if (state.view === "list") {
    let month = "";
    body =
      '<div class="list-table-header"><span>Date</span><span class="artist-label">Artist & sound</span><span>Venue & size</span><span></span></div>';
    for (const e of list.slice(0, state.limit)) {
      const m = e.date?.slice(0, 7) || "tba";
      if (m !== month) {
        month = m;
        body += `<div class="month-heading">${m === "tba" ? "Date to be announced" : dateLabel(m + "-01", { month: "long" })} <span>${m === "tba" ? "" : m.slice(0, 4)}</span></div>`;
      }
      body += row(e);
    }
    if (list.length > state.limit)
      body += button(
        "more-events",
        `Show more · ${list.length - state.limit} remaining`,
        "show-more",
      );
  } else if (state.view === "calendar") body = calendarView(list);
  else if (state.view === "venue") body = venueView(list);
  else body = mapView(list);
  root.innerHTML = resultsBar(list) + feedNote() + body;
  if (state.view === "map" && list.length)
    requestAnimationFrame(() => initializeMap(list));
  persistUI();
}
function calendarView(list) {
  const first = state.calendarMonth + "-01",
    d = new Date(first + "T12:00:00Z");
  const start = addDays(first, -d.getUTCDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return `<div class="calendar-header"><h2>${dateLabel(first, { month: "long", year: "numeric" })}</h2><div class="nav">${button("calendar-today", "Today", "text-button")}${icoButton("calendar-prev", "left", "Previous month")}${icoButton("calendar-next", "right", "Next month")}</div></div><div class="calendar-grid">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="calendar-weekday">${d}</div>`).join("")}${days
    .map((day) => {
      const dayEvents = list.filter((e) => e.date === day);
      return `<div class="calendar-day ${day.slice(0, 7) !== state.calendarMonth ? "outside" : ""} ${day === dayInZone() ? "today" : ""}"><span class="num">${Number(day.slice(8))}</span>${dayEvents
        .slice(0, 3)
        .map((e) =>
          button(
            "open",
            esc(e.title),
            "calendar-event",
            `data-id="${esc(e.id)}" style="--city:${esc(cityFor(e.metro).color)}" title="${esc(e.title + " · " + e.venue.name)}"`,
          ),
        )
        .join(
          "",
        )}${dayEvents.length > 3 ? button("calendar-day", `+${dayEvents.length - 3} more`, "calendar-more", `data-day="${day}"`) : ""}</div>`;
    })
    .join("")}</div>`;
}
function venueView(list) {
  return `<div class="venue-grid">${groupVenues(list)
    .sort((a, b) => a.venue.name.localeCompare(b.venue.name))
    .map(
      ({ venue: v, events: ev }) =>
        `<article class="venue-card"><div class="location-line"><span class="city-dot" style="--city:${esc(cityFor(v.metro).color)}"></span>${esc(v.locality || cityFor(v.metro).name)}<span style="margin-left:auto">${ev.length} shows</span></div><h3>${esc(v.name)}${v.room ? " · " + esc(v.room) : ""}</h3><div class="capacity">${sizeDots(v)}${esc(capacityLabel(v))}${v.capacity ? " capacity" : ""}</div>${ev
          .slice(0, 4)
          .map((e) =>
            button(
              "open",
              `<small>${dateLabel(e.date)} · ${esc(timeLabel(e))}</small>${esc(e.title)}${assessment(store.fields, e.id).saved ? " ♡" : ""}`,
              "event-snippet",
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
    el.innerHTML = `<span class="eyebrow">The lay of the land</span><h3 style="margin-top:16px">A good night,<br>somewhere nearby.</h3><p>Select a venue pin to see its upcoming shows. Use the city buttons to jump between metros.</p><p>Filled pins show concert counts. A star marks a venue with a saved show.</p>`;
    return;
  }
  const { venue: v, events: ev } = group;
  el.innerHTML = `<span class="eyebrow">${esc(v.locality)}</span><h3 style="margin:12px 0">${esc(v.name)}${v.room ? " · " + esc(v.room) : ""}</h3><div class="capacity">${sizeDots(v)}${esc(capacityLabel(v))}</div><p style="margin-top:10px">${esc(v.address)}</p>${ev.map((e) => button("open", `<small>${dateLabel(e.date)} · ${esc(timeLabel(e))}</small><b>${esc(e.title)} ${assessment(store.fields, e.id).saved ? "★" : ""}</b>`, "event-snippet", `data-id="${esc(e.id)}"`)).join("")}`;
}
function initializeMap(list) {
  if (!$("#concert-map")) return;
  if (!window.L) {
    $("#concert-map").innerHTML =
      '<p class="map-error">The map could not load. Your concerts are still available in List view.</p>';
    return;
  }
  map = L.map("concert-map", { scrollWheelZoom: false, zoomControl: true });
  const tiles = L.tileLayer(
    config.mapTileURL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: config.mapAttribution || "© OpenStreetMap contributors",
      maxZoom: 19,
    },
  );
  tiles.addTo(map);
  let tileErrors = 0;
  tiles.on("tileerror", () => {
    if (++tileErrors === 4)
      toast(
        "Some map tiles could not load. Venue pins and the list remain available.",
      );
  });
  markerGroup = L.markerClusterGroup({
    maxClusterRadius: 45,
    showCoverageOnHover: false,
    iconCreateFunction: (cluster) =>
      L.divIcon({
        html: `<div class="map-cluster">${cluster.getChildCount()}</div>`,
        className: "",
        iconSize: [38, 38],
      }),
  });
  const points = [];
  for (const g of groupVenues(list)) {
    const v = g.venue;
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
    points.push([v.lat, v.lng]);
    const saved = g.events.some((e) => assessment(store.fields, e.id).saved);
    const marker = L.marker([v.lat, v.lng], {
      title: `${v.name}: ${g.events.length} concerts${saved ? ", saved shows" : ""}`,
      icon: L.divIcon({
        className: "",
        html: `<div class="map-pin" style="--city:${esc(cityFor(v.metro).color)}"><span>${saved ? "★ " : ""}${g.events.length}</span></div>`,
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
    }
  }
}
function saveEvent(e, force) {
  const next = force ?? !assessment(store.fields, e.id).saved;
  store.change(`event/${e.id}/snapshot`, e);
  store.change(`event/${e.id}/saved`, next);
  toast(
    next
      ? "Saved to your notebook."
      : "Removed from saved. Your notes are kept.",
  );
  updateDetailMeta();
}
function setAssessment(id, field, value) {
  const e = eventFor(id);
  if (!e) return;
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
  return `<div class="rating-row"><div><strong>${label}</strong><small>${hint}</small></div><div class="rating-control" role="group" aria-label="${label} rating">${[1, 2, 3, 4, 5].map((n) => button("rate", n, `rating-score ${value === n ? "selected" : ""}`, `data-id="${esc(id)}" data-field="${key}" data-score="${n}" aria-label="${label}: ${n} out of 5" aria-pressed="${value === n}"`)).join("")}${button("clear-rating", "×", "clear-score", `data-id="${esc(id)}" data-field="${key}" aria-label="Clear ${label.toLowerCase()} rating"`)}</div></div>`;
}
function openDetail(id, listen = false) {
  const e = eventFor(id);
  if (!e) return;
  detailReturnFocus = document.activeElement;
  detailNoteRev = store.fields[`event/${id}/notes`]?.rev || 0;
  state.selected = id;
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
    `<div class="scrim" data-action="close-detail"></div><section class="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title"><header class="detail-top"><span class="eyebrow">Your next night out</span>${icoButton("close-detail", "close", "Close concert")}</header><div class="detail-body"><div class="detail-date">${icon("calendar")}${dateLabel(e.date)} · ${esc(timeLabel(e))} · ${esc(e.timezone === "America/Los_Angeles" ? "Pacific time" : e.timezone === "America/New_York" ? "Eastern time" : e.timezone)}</div><h2 id="detail-title" class="detail-title">${esc(e.title)}</h2><div class="detail-venue">${icon("pin")}${esc(e.venue.name)} · ${esc(e.venue.locality || city.name)}</div><div class="event-tags">${e.genres?.map((g) => `<span class="genre-tag">${esc(g)}</span>`).join("") || ""}${match ? `<span class="spotify-tag">${icon("spotify")}${esc(match.name + ": " + match.reason)}</span>` : ""}${e.status !== "scheduled" ? `<span class="status-tag">${esc(e.status)}</span>` : ""}</div>${e.missingFromFeed ? '<p class="detail-warning">Kept from your notebook. This show is no longer in the current feed; check the venue for updates.</p>' : ""}<div class="detail-buttons"><a class="primary" href="${esc(safeURL(e.ticketUrl))}" target="_blank" rel="noopener noreferrer">${icon("ticket")}Tickets ${icon("external")}</a>${button("detail-save", icon("bookmark") + (a.saved ? "Saved" : "Save"), "secondary", `data-id="${esc(id)}" aria-pressed="${a.saved}"`)}${icoButton("export-one", "calendar", "Export to calendar", `data-id="${esc(id)}"`, "secondary")}</div><section class="detail-section" id="listen-section"><div class="section-title"><h3>Get a feel for the music.</h3><small>Live first, always.</small></div><div class="artist-tabs">${(e.artists?.length ? e.artists : [{ name: e.title }]).map((a, i) => button("artist", esc(a.name), `artist-tab ${i === 0 ? "active" : ""}`, `data-artist="${esc(a.name)}"`)).join("")}</div><div id="player" class="player"><div class="player-placeholder">${icon("headphones")}<strong>A little preview of the night.</strong><span>Choose a recording below.<br>Nothing plays until you press play.</span></div></div><div class="media-mode">${[
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
      )}</div><form id="media-search" class="media-search"><input id="media-query" aria-label="Search recordings" placeholder="Search recordings or paste a YouTube link"><button class="secondary" type="submit" aria-label="Search recordings">${icon("search")}</button></form><div id="media-results"></div></section><section class="detail-section"><div class="section-title"><h3>Your take.</h3><small id="detail-sync">${esc(store.status)}</small></div><div id="ratings">${ratingRow(id, "music", "Music", "How it sounds to you")}${ratingRow(id, "venue", "Venue", "The night you expect here")}${ratingRow(id, "visuals", "Visuals", "Stage, lights & performance")}</div><label class="note-label" for="concert-note">Notes to future you <small>Only in your notebook</small></label><textarea id="concert-note" maxlength="30000" data-id="${esc(id)}" placeholder="What caught your ear? What’s the room like?">${esc(a.notes)}</textarea><p class="media-notice">Notes and ratings save this concert automatically. Your impressions can change; come back and edit anytime.</p></section><section class="detail-section"><div class="section-title"><h3>The room matters.</h3></div><div class="venue-facts"><strong>${esc(capacityLabel(e.venue))}${e.venue.capacity ? " people" : ""}</strong><p>${esc(e.venue.capacity?.configuration || e.venue.layout || "Room configuration not published.")}</p>${e.venue.capacity ? `<a class="source-link" href="${esc(safeURL(e.venue.capacity.source))}" target="_blank" rel="noopener">Capacity source · checked ${esc(e.venue.capacity.verifiedAt)}</a>` : "<p>We haven’t verified this venue’s capacity yet.</p>"}</div><p class="detail-address">${esc(e.venue.name)}${e.venue.room ? " · " + esc(e.venue.room) : ""}<br>${esc(e.venue.address)}</p><a class="secondary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue.name + " " + e.venue.address)}" target="_blank" rel="noopener">${icon("map")}Open directions ${icon("external")}</a></section><section class="detail-section"><div class="eyebrow" style="margin-bottom:12px">From the source</div><div class="source-list">${e.sources?.map((s) => `<a href="${esc(safeURL(s.url))}" target="_blank" rel="noopener">${esc(s.name)} ↗</a>`).join("") || ""}</div><p class="media-notice">Schedules can change. Confirm details with the venue before heading out.</p></section></div></section>`;
  $("#app").inert = true;
  document.body.style.overflow = "hidden";
  $(".detail-top button").focus();
  loadMedia();
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
    btn.innerHTML = icon("bookmark") + (a.saved ? "Saved" : "Save");
    btn.setAttribute("aria-pressed", a.saved);
  }
  const status = $("#detail-sync");
  if (status) status.textContent = store.status;
  for (const el of document.querySelectorAll('[data-action="rate"]')) {
    const chosen = a[el.dataset.field] === +el.dataset.score;
    el.classList.toggle("selected", chosen);
    el.setAttribute("aria-pressed", chosen);
  }
}
function closeDetail() {
  $("#app").inert = false;
  state.selected = null;
  mediaRequest++;
  $("#detail-root").innerHTML = "";
  document.body.style.overflow = "";
  if (detailReturnFocus?.isConnected) detailReturnFocus.focus();
}
function renderMedia() {
  const m = state.media,
    root = $("#media-results");
  if (!root) return;
  if (m.loading && !m.items.length) {
    root.innerHTML = '<p class="media-notice">Looking for recordings…</p>';
    return;
  }
  root.innerHTML = `${m.error ? `<p class="media-notice">${esc(m.error)}</p>${button("retry-media", "Try again", "small-button")}` : ""}${!m.items.length && !m.loading ? '<p class="media-notice">No recordings found in the connected source. Try a shorter artist name or All music.</p>' : ""}<div class="media-results">${m.items.map((item, i) => button("play-recording", `<img class="media-thumbnail" src="${esc(safeURL(item.thumbnail))}" alt="" loading="lazy"><span><strong>${esc(item.title)}</strong><small>${item.kind === "audio" ? "Audio" : "Video"} · ${esc(item.channel || item.provider)}${item.duration ? " · " + esc(item.duration.replace("PT", "").toLowerCase()) : ""}</small></span>`, `media-result ${m.playing === i ? "active" : ""}`, `data-index="${i}"`)).join("")}</div>${m.hasMore ? button("more-media", m.loading ? "Loading…" : "More recordings", "small-button", m.loading ? "disabled" : "") : ""}<p class="media-notice">${esc(m.notice || "Recordings from " + (m.provider === "youtube" ? "YouTube" : "Internet Archive") + ".")}</p><div class="form-actions"><a class="text-button" href="https://www.youtube.com/results?search_query=${encodeURIComponent(m.artist + " live performance")}" target="_blank" rel="noopener">Search YouTube ${icon("external")}</a><a class="text-button" href="https://open.spotify.com/search/${encodeURIComponent(m.artist)}" target="_blank" rel="noopener">Open Spotify ${icon("external")}</a></div>`;
}
async function loadMedia(more = false) {
  const req = ++mediaRequest,
    m = state.media;
  if (!more) {
    m.items = [];
    m.page = 1;
    m.nextPageToken = "";
    m.playing = null;
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
  $("#player").innerHTML =
    `<iframe title="${esc(item.title)}" src="${esc(embed)}${embed.includes("?") ? "&" : "?"}autoplay=1" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="playing-label"><span>${esc(item.title)}</span><a href="${esc(item.url)}" target="_blank" rel="noopener">Can’t play? Open source ↗</a></div>`;
  renderMedia();
}
function openModal(title, body, wide = false) {
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
  $("#app").inert = !!state.selected;
  $("#detail-root").inert = false;
  $("#modal-root").innerHTML = "";
  document.body.style.overflow = state.selected ? "hidden" : "";
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
}
function profileModal(mode = "create") {
  if (store.profile) {
    openModal(
      "Your notebook",
      `<p>Signed in as <strong>${esc(store.profile)}</strong>. ${esc(store.status)}.</p>${store.lastError ? `<p class="form-error">${esc(store.lastError)}</p>` : ""}<p>Use your username and private sync code on your other device. Keep the code somewhere you can find it again.</p><label class="form-field">Private sync code<input type="password" value="${esc(store.data.code)}" readonly id="sync-code" aria-label="Private sync code"></label><div class="form-actions">${button("copy-code", "Copy sync code", "primary")}${button("show-code", "Show code", "secondary")}${button("sync-now", "Sync now", "secondary")}</div><div class="sidebar-rule"></div><p>Signing out keeps pending changes on this device. Your browser-only notebook will reappear.</p>${button("logout", "Sign out", "secondary")}`,
    );
    return;
  }
  if (state.capabilities.sync === false) {
    openModal(
      "Not signed in",
      "<p>You’re using a guest notebook. Your saved concerts, ratings, notes, cities, and imported listening totals are stored in this browser on this device.</p><p>Cross-device sign-in is not available yet: the cloud database still needs to be connected. Clearing this site’s browser data will remove your guest notebook.</p>",
    );
    return;
  }
  openModal(
    "Make it your notebook.",
    `<p>Give your saved nights a home across devices. A username and a private sync code are all you need.</p><div class="profile-tabs">${button("profile-create-tab", "New notebook", `chip ${mode === "create" ? "active" : ""}`)}${button("profile-login-tab", "Existing notebook", `chip ${mode === "login" ? "active" : ""}`)}</div><form id="profile-form" data-mode="${mode}"><label class="form-field">Username<input id="profile-name" name="username" autocomplete="username" placeholder="e.g. devon" pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}" minlength="3" maxlength="32" required></label>${mode === "login" ? '<label class="form-field">Private sync code<input id="profile-code" name="code" autocomplete="current-password" type="password" required></label>' : ""}<button type="submit" class="primary">${mode === "create" ? "Create notebook" : "Open notebook"}</button><p id="profile-error" class="form-error" role="alert"></p></form><p class="media-notice">${mode === "create" ? "Your current browser-only saves will come with you." : "Your browser-only notebook stays separate."} ${state.capabilities.storage === "local" ? "This preview syncs devices connected to the same running server." : ""}</p>`,
  );
}
function citiesModal() {
  openModal(
    "A few places to be.",
    `<p>Follow metro areas, then toggle them on and off as your plans change. Removing a city keeps its saved concerts.</p><div id="city-settings">${cities()
      .map(
        (c) =>
          `<div class="city-settings-row"><span class="city-dot" style="--city:${esc(c.color)}"></span><div><strong>${esc(c.name)}</strong><small>${esc(c.region || "Metro area")}${!DEFAULT_CITIES.some((d) => d.id === c.id) ? ` · <label>Radius <input type="number" min="1" max="200" value="${c.radius}" data-radius-city="${esc(c.id)}" aria-label="Radius in miles for ${esc(c.name)}"> miles</label>` : ""}</small></div>${icoButton("remove-city", "close", "Remove " + c.name, `data-city="${esc(c.id)}"`)}</div>`,
      )
      .join(
        "",
      )}</div><form id="city-search" class="city-search-form"><input id="city-query" placeholder="Search for a city" aria-label="City name" required minlength="2"><button class="primary" type="submit">Find city</button></form><div id="place-results"></div><p class="media-notice">New metros need a connected catalog source for automatic listings beyond the included venue calendars. Place search: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> / <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a>.</p>`,
  );
}
let placeResults = [];
function listeningModal() {
  const l = listening() || {},
    artists = [
      ...new Map(Object.values(l).map((a) => [normalize(a.name), a])).values(),
    ].sort((a, b) => b.score - a.score);
  openModal(
    "A familiar sound.",
    `<p>Match upcoming lineups to the music you already listen to. Your concert list stays chronological unless you choose match-first sorting.</p>${
      artists.length
        ? `<div class="venue-facts"><strong>${artists.length} artists</strong><p>Ready to match with upcoming shows.</p></div><p>${artists
            .slice(0, 6)
            .map((a) => esc(a.name))
            .join(" · ")}${artists.length > 6 ? " …" : ""}</p>`
        : ""
    }<div class="import-drop">${icon("upload")}<strong>Import your Spotify listening history</strong><p>No Premium or developer account needed.</p><input id="spotify-import" type="file" accept=".json,application/json" multiple aria-label="Import Spotify streaming-history JSON files"></div><p id="import-status" role="status"></p><p>Request <a href="https://www.spotify.com/account/privacy/" target="_blank" rel="noopener">your data from Spotify</a>, then choose the streaming-history JSON files here. You can select several files together. Only per-artist play totals are kept; the raw history stays in your browser. Importing replaces the previous listening summary.</p>${state.capabilities.spotify ? `<div class="sidebar-rule"></div><p>You can also connect Spotify for automatic updates.</p><div class="form-actions">${button("connect-spotify", "Connect Spotify", "secondary")}${store.data.spotify ? button("refresh-spotify", "Refresh listening", "secondary") : ""}</div>` : '<p class="media-notice">Automatic Spotify connection isn’t configured in this installation. Importing works independently.</p>'}${artists.length ? `<div class="sidebar-rule"></div>${button("clear-listening", "Remove listening data", "text-button")}` : ""}`,
  );
}
function sourcesModal() {
  const byCity = DEFAULT_CITIES.map((c) => ({
    c,
    sources: state.feed.sources.filter((s) => s.metro === c.id),
  }));
  openModal(
    "The picture so far.",
    `<p>These are real listings from official venue calendars. This is a growing, partial catalog—not every show in the metro. A failed calendar is a gap, not an empty concert schedule.</p>${state.feed.updatedAt ? `<p>Catalog updated ${new Date(state.feed.updatedAt).toLocaleString()}.</p>` : ""}<table class="source-table"><thead><tr><th class="metro-column">Metro</th><th>Venue / source</th><th>Shows</th><th>Status</th></tr></thead><tbody>${byCity.flatMap(({ c, sources }) => sources.map((s) => `<tr><td class="metro-column">${esc(c.short)}</td><td><a href="${esc(safeURL(s.url))}" target="_blank" rel="noopener">${esc(s.name)} ↗</a><small>${esc(s.message || "Official venue calendar.")}</small></td><td>${s.count || 0}</td><td><span class="source-status ${s.status === "error" ? "error" : ""}">${s.status === "ok" ? "Loaded" : s.status === "error" ? "Unavailable" : "No listings"}</span></td></tr>`)).join("")}</tbody></table><div class="sidebar-rule"></div><p><strong>Broader discovery:</strong> ${state.capabilities.ticketmaster ? "Ticketmaster is connected for supported metros." : "Ticketmaster is not connected. It can expand city coverage once a free developer API key is configured."}</p><p><strong>Recordings:</strong> ${state.capabilities.youtube ? "YouTube search is connected, with Internet Archive as a fallback." : "Internet Archive works without keys. YouTube search needs a free developer API key."}</p><p><strong>Maps:</strong> OpenStreetMap contributors. Venue positions are verified source coordinates or matched venue addresses. Capacity figures cite their sources in concert details; unknown sizes are left blank.</p>`,
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
    .filter((e) => assessment(store.fields, e.id).saved && isUpcoming(e))
    .sort((a, b) => a.date.localeCompare(b.date));
  openModal(
    "Make room for a good night.",
    `<p>Choose saved concerts to export. Calendar files are snapshots; they won’t automatically track changes. Private notes and reminders are not included.</p>${list.length ? `<label class="check-label"><input type="checkbox" id="export-all" checked>Select all</label><div class="export-list">${list.map((e) => `<label class="export-item"><input type="checkbox" name="export-event" value="${esc(e.id)}" checked><span>${esc(e.title)}<small>${dateLabel(e.date)} · ${esc(e.venue.name)}${!e.time ? " · Time TBA" : ""}</small></span></label>`).join("")}</div>${button("download-selected", "Download calendar file", "primary")}` : "<p>No upcoming saved concerts to export yet.</p>"}`,
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
    `<p>This note changed on two devices. Neither version has been discarded. Choose which text to keep, or combine them.</p><strong>Currently synced</strong><div class="conflict-note">${esc(current)}</div><strong>Incoming edit</strong><div class="conflict-note">${esc(c.incoming)}</div><div class="form-actions">${button("resolve-conflict", "Keep synced", "secondary", `data-conflict="${esc(c.id)}" data-choice="existing"`)}${button("resolve-conflict", "Keep incoming", "secondary", `data-conflict="${esc(c.id)}" data-choice="incoming"`)}${button("resolve-conflict", "Keep both", "primary", `data-conflict="${esc(c.id)}" data-choice="both"`)}</div>`,
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
  const first = state.calendarMonth + "-01";
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = addDays(d.toISOString().slice(0, 10), -1);
  if (first < state.from || last > state.to) {
    state.preset = "custom";
    state.from = first;
    state.to = last;
    renderControls();
    loadFeed();
  } else renderResults();
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
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const action = el.dataset.action,
    id = el.dataset.id;
  try {
    switch (action) {
      case "tab":
        state.tab = el.dataset.tab;
        state.sort = "date";
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
      case "date-preset":
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
        toast("Loaded the latest available catalog.");
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
        state.media.query = "";
        document
          .querySelectorAll(".artist-tab")
          .forEach((b) => b.classList.toggle("active", b === el));
        $("#media-query").value = "";
        $("#media-query").placeholder =
          "Search recordings or paste a YouTube link";
        $("#player").innerHTML =
          `<div class="player-placeholder">${icon("headphones")}<strong>${esc(state.media.artist)}</strong><span>Choose a recording below.</span></div>`;
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
        const list = filtered().filter((e) => e.date === el.dataset.day);
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
      case "clear-listening":
        if (store.data.spotify) await store.apiCall("spotify-disconnect", {});
        store.change("listening", null);
        closeModal();
        toast("Listening data removed.");
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
          "encore-saved-concerts.ics",
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
  if (el.id === "sort") {
    state.sort = el.value;
    renderResults();
  }
  if (el.id === "date-from" || el.id === "date-to") {
    const from = $("#date-from").value,
      to = $("#date-to").value;
    if (
      !from ||
      !to ||
      to < from ||
      Date.parse(to) - Date.parse(from) > 366 * 86400000
    ) {
      toast("Choose a valid range of one year or less.");
      return;
    }
    state.from = from;
    state.to = to;
    state.preset = "custom";
    state.calendarMonth = from.slice(0, 7);
    filtersChanged(true);
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
      let plays = 0;
      for (const file of el.files) {
        if (file.size > 150 * 1024 * 1024)
          throw new Error("Choose JSON files smaller than 150 MB each.");
        const data = importSpotifyHistory(JSON.parse(await file.text()));
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
        toast("Your notebook is ready. Keep your sync code.");
      } else {
        await store.login(name, $("#profile-code").value);
        closeModal();
        toast("Notebook opened.");
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
