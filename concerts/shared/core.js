export const DEFAULT_CITIES = [
  {
    id: "sf",
    name: "SF Bay Area",
    short: "SF",
    color: "#bd6542",
    lat: 37.77,
    lng: -122.25,
    radius: 70,
    timezone: "America/Los_Angeles",
    region: "San Francisco, East Bay, Peninsula, South Bay & North Bay",
    boxes: [[36.89, -123.54, 38.87, -121.2]],
    enabled: true,
  },
  {
    id: "miami",
    name: "Miami metro",
    short: "MIA",
    color: "#3a8077",
    lat: 26.1,
    lng: -80.2,
    radius: 80,
    timezone: "America/New_York",
    region: "Miami-Dade, Broward & Palm Beach counties",
    boxes: [[25.14, -80.9, 27.0, -79.95]],
    enabled: true,
  },
  {
    id: "nyc",
    name: "New York metro",
    short: "NYC",
    color: "#7872a1",
    lat: 40.76,
    lng: -73.75,
    radius: 65,
    timezone: "America/New_York",
    region:
      "NYC, Long Island, northern NJ, Westchester/Rockland & southwest CT",
    boxes: [[40.42, -74.55, 41.35, -71.85]],
    enabled: true,
  },
];
export const SIZE_BUCKETS = [
  ["any", "Any size", 0, Infinity],
  ["intimate", "Under 300", 0, 299],
  ["small", "300–999", 300, 999],
  ["medium", "1,000–2,999", 1000, 2999],
  ["large", "3,000–9,999", 3000, 9999],
  ["huge", "10,000+", 10000, Infinity],
  ["unknown", "Size unknown", null, null],
];
export const normalize = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export const escapeHTML = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function safeURL(s) {
  try {
    const u = new URL(s);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
export function hash(s) {
  let n = 2166136261;
  for (const c of String(s)) {
    n ^= c.charCodeAt(0);
    n = Math.imul(n, 16777619);
  }
  return (n >>> 0).toString(36);
}
export function dayInZone(date = new Date(), zone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function addDays(day, n) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function dateRange(preset = "60", now = new Date()) {
  const from = dayInZone(now);
  if (preset === "next-weekend") {
    const thisSunday = dateRange("weekend", now).to;
    return { from: addDays(thisSunday, 5), to: addDays(thisSunday, 7) };
  }
  if (preset === "weekend") {
    let n = (5 - new Date(from + "T12:00:00Z").getUTCDay() + 7) % 7;
    if ([0, 6].includes(new Date(from + "T12:00:00Z").getUTCDay())) n = 0;
    const start = addDays(from, n);
    return {
      from: start,
      to: addDays(start, (7 - new Date(start + "T12:00:00Z").getUTCDay()) % 7),
    };
  }
  return { from, to: addDays(from, Number(preset) || 60) };
}
export function localToISO(day, time, zone) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day || "") ||
    !/^\d\d:\d\d(:\d\d)?$/.test(time || "")
  )
    return null;
  const [y, m, d] = day.split("-").map(Number),
    [h, min, sec = 0] = time.split(":").map(Number);
  if (h > 23 || min > 59 || sec > 59) return null;
  const target = Date.UTC(y, m - 1, d, h, min, sec);
  if (new Date(target).toISOString().slice(0, 10) !== day) return null;
  let guess = target;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 4; i++) {
    const p = Object.fromEntries(
      fmt.formatToParts(new Date(guess)).map((x) => [x.type, x.value]),
    );
    const projected = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second,
    );
    const diff = target - projected;
    if (!diff) return new Date(guess).toISOString();
    guess += diff;
  }
  return null; // Nonexistent local time at a daylight-saving transition.
}
export function timeLabel(e) {
  if (!e.time) return "Time TBA";
  const [h, m] = e.time.split(":").map(Number);
  return `${h % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""}${h >= 12 ? "pm" : "am"}${e.timeKind === "doors" ? " doors" : ""}`;
}
export function dateLabel(
  day,
  options = { month: "short", day: "numeric", weekday: "short" },
) {
  return day
    ? new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
        new Date(day + "T12:00:00Z"),
      )
    : "Date TBA";
}
export function isUpcoming(e, now = new Date()) {
  if (e.status === "cancelled" || !e.date) return false;
  return e.startAt
    ? new Date(e.startAt) >= now
    : e.date >= dayInZone(now, e.timezone);
}
export function capacityLabel(v) {
  if (!v?.capacity) return "Size unknown";
  const { min, max } = v.capacity;
  return `${min !== max ? Number(min).toLocaleString() + "–" : ""}${Number(max).toLocaleString()}${v.capacity.approximate ? " approx." : ""}`;
}
export function sizeMatches(v, key) {
  if (!key || key === "any") return true;
  const c = v?.capacity;
  if (key === "unknown") return !c;
  if (!c) return false;
  const b = SIZE_BUCKETS.find((x) => x[0] === key);
  return !b || (c.min <= b[3] && c.max >= b[2]);
}
export function inMetro(v, city) {
  if (!Number.isFinite(v?.lat) || !Number.isFinite(v?.lng))
    return v?.metro === city.id;
  if (city.boxes)
    return city.boxes.some(
      ([s, w, n, e]) => v.lat >= s && v.lat <= n && v.lng >= w && v.lng <= e,
    );
  const r = Math.PI / 180,
    a =
      Math.sin(((v.lat - city.lat) * r) / 2) ** 2 +
      Math.cos(v.lat * r) *
        Math.cos(city.lat * r) *
        Math.sin(((v.lng - city.lng) * r) / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= city.radius;
}
export const valueAt = (fields, key, fallback = null) =>
  fields?.[key]?.value ?? fallback;
export function assessment(fields, id) {
  const key = `event/${id}/`;
  return {
    saved: valueAt(fields, key + "saved", false),
    notes: valueAt(fields, key + "notes", ""),
    music: valueAt(fields, key + "music"),
    venue: valueAt(fields, key + "venue"),
    visuals: valueAt(fields, key + "visuals"),
    snapshot: valueAt(fields, key + "snapshot"),
    savedAt: fields?.[key + "saved"]?.at || "",
  };
}
export function citiesFrom(fields) {
  const cities = new Map(DEFAULT_CITIES.map((c) => [c.id, { ...c }]));
  for (const [k, v] of Object.entries(fields || {})) {
    if (k.startsWith("city/")) cities.set(k.slice(5), v.value);
  }
  return [...cities.values()].filter((c) => c?.followed !== false);
}
export function allEvents(feed, fields) {
  const events = new Map((feed || []).map((e) => [e.id, e]));
  for (const [key, field] of Object.entries(fields || {})) {
    if (
      key.endsWith("/snapshot") &&
      field.value?.id &&
      !events.has(field.value.id)
    )
      events.set(field.value.id, { ...field.value, missingFromFeed: true });
  }
  return [...events.values()];
}
export function spotifyMatch(e, listening = {}) {
  listening ||= {};
  let best = null;
  for (const a of e.artists || []) {
    const item = listening[a.spotifyId] || listening[normalize(a.name)];
    if (item && (!best || item.score > best.score))
      best = { ...item, name: a.name };
  }
  return best;
}
export function filterEvents(
  events,
  filters,
  fields = {},
  listening = {},
  now = new Date(),
) {
  const enabled = (filters.cities || DEFAULT_CITIES).filter((c) => c.enabled);
  const q = normalize(filters.query);
  let result = events.filter((e) => {
    const a = assessment(fields, e.id);
    if (filters.tab === "saved" && !a.saved) return false;
    if (!enabled.some((c) => e.metro === c.id || inMetro(e.venue, c)))
      return false;
    if (filters.tab === "saved" && filters.savedPeriod === "past") {
      if (
        !e.date ||
        (e.startAt
          ? new Date(e.startAt) >= now
          : e.date >= dayInZone(now, e.timezone))
      )
        return false;
    } else if (filters.tab === "saved" && filters.savedPeriod === "all") {
    } else if (e.date && (e.date < filters.from || e.date > filters.to))
      return false;
    if (
      filters.tab === "saved" &&
      filters.savedPeriod === "upcoming" &&
      !isUpcoming(e, now)
    )
      return false;
    if (
      filters.genre &&
      filters.genre !== "any" &&
      !(e.genres?.length ? e.genres : ["Unknown"]).includes(filters.genre)
    )
      return false;
    if (
      filters.venue &&
      filters.venue !== "any" &&
      e.venue?.id !== filters.venue
    )
      return false;
    if (!sizeMatches(e.venue, filters.size)) return false;
    if (filters.matches && !spotifyMatch(e, listening)) return false;
    if (
      filters.unmapped &&
      Number.isFinite(e.venue?.lat) &&
      Number.isFinite(e.venue?.lng)
    )
      return false;
    return (
      !q ||
      normalize(
        [
          e.title,
          e.venue?.name,
          ...(e.artists || []).map((a) => a.name),
          a.notes,
        ].join(" "),
      ).includes(q)
    );
  });
  const byDate = (a, b) =>
    (a.date || "9999").localeCompare(b.date || "9999") ||
    (a.time || "99").localeCompare(b.time || "99") ||
    a.title.localeCompare(b.title);
  return result.sort((a, b) => {
    let d = 0;
    if (["music", "venue", "visuals"].includes(filters.sort))
      d =
        (assessment(fields, b.id)[filters.sort] ?? -1) -
        (assessment(fields, a.id)[filters.sort] ?? -1);
    else if (filters.sort === "saved")
      d = assessment(fields, b.id).savedAt.localeCompare(
        assessment(fields, a.id).savedAt,
      );
    else if (filters.sort === "matches")
      d =
        (spotifyMatch(b, listening)?.score || 0) -
        (spotifyMatch(a, listening)?.score || 0);
    return d || byDate(a, b);
  });
}
export function savedCounts(events, fields, now = new Date()) {
  const saved = events.filter((e) => assessment(fields, e.id).saved);
  return {
    total: saved.length,
    upcoming: saved.filter((e) => isUpcoming(e, now)).length,
  };
}
export function groupVenues(events) {
  const groups = new Map();
  for (const e of events) {
    const id = e.venue?.id || "unknown";
    if (!groups.has(id)) groups.set(id, { venue: e.venue, events: [] });
    groups.get(id).events.push(e);
  }
  return [...groups.values()];
}
export function mergeEvents(events) {
  const map = new Map();
  for (const e of events) {
    if (!e?.id || !e.title) continue;
    const prior = map.get(e.id);
    if (prior) {
      map.set(e.id, { ...prior, ...e });
      continue;
    }
    map.set(e.id, e);
  }
  // Only collapse identical venue/artist/date/time matches. Distinct nights and shows survive.
  const aliases = new Map(),
    result = [];
  for (const e of map.values()) {
    const key =
      e.date && e.time
        ? `${normalize(e.venue?.name)}|${e.date}|${e.time}|${normalize(e.artists?.[0]?.name || e.title)}`
        : e.id;
    if (aliases.has(key)) {
      const old = aliases.get(key);
      old.sources = [
        ...new Map(
          [...(old.sources || []), ...(e.sources || [])].map((s) => [s.url, s]),
        ).values(),
      ];
      old.aliases = [...(old.aliases || []), e.id];
      if (!old.genres?.length && e.genres?.length) old.genres = e.genres;
    } else {
      aliases.set(key, e);
      result.push(e);
    }
  }
  return result;
}
export function importSpotifyHistory(doc) {
  const list = Array.isArray(doc) ? doc : doc?.plays || doc?.streamingHistory;
  if (!Array.isArray(list))
    throw new Error("Choose Spotify streaming-history JSON files.");
  const artists = {};
  let count = 0;
  for (const row of list) {
    const name = row.master_metadata_album_artist_name || row.artistName;
    const ms = Number(row.ms_played ?? row.msPlayed ?? 0);
    if (!name || ms < 30000) continue;
    const key = normalize(name);
    if (!artists[key])
      artists[key] = {
        name,
        plays: 0,
        minutes: 0,
        score: 0,
        reason: "In your listening history",
        source: "import",
      };
    artists[key].plays++;
    artists[key].minutes += ms / 60000;
    count++;
  }
  for (const a of Object.values(artists)) {
    a.minutes = Math.round(a.minutes);
    a.score = a.minutes;
    a.reason = `${a.plays.toLocaleString()} plays in your import`;
  }
  return { artists, count };
}
const icsEscape = (s) =>
  String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
function foldLine(s) {
  let out = "",
    line = "",
    bytes = 0;
  for (const c of s) {
    const len = new TextEncoder().encode(c).length;
    if (bytes + len > 75) {
      out += line + "\r\n";
      line = " ";
      bytes = 1;
    }
    line += c;
    bytes += len;
  }
  return out + line;
}
export function calendarICS(events, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Encore//Concert notebook//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events.filter((e) => e.date && e.status !== "cancelled")) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@concerts.devonzuegel.com`,
      `DTSTAMP:${now
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `SUMMARY:${icsEscape(e.title)}`,
    );
    const start =
      e.startAt || (e.time && localToISO(e.date, e.time, e.timezone));
    if (start)
      lines.push(
        `DTSTART:${new Date(start)
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "")}`,
      );
    else lines.push(`DTSTART;VALUE=DATE:${e.date.replaceAll("-", "")}`);
    if (e.endAt && start)
      lines.push(
        `DTEND:${new Date(e.endAt)
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "")}`,
      );
    lines.push(
      `LOCATION:${icsEscape([e.venue?.name, e.venue?.address].filter(Boolean).join(", "))}`,
      `DESCRIPTION:${icsEscape([!start ? "Time TBA" : e.timeKind === "doors" ? "Listed time is doors; performance time not announced." : "", e.timezone, e.ticketUrl || e.sources?.[0]?.url].filter(Boolean).join("\n"))}`,
      `URL:${safeURL(e.ticketUrl || e.sources?.[0]?.url)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function youtubeVideoID(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.replace(/^www\./, "");
    let id;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (
      ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)
    )
      id =
        u.searchParams.get("v") ||
        u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
  } catch {
    return null;
  }
}
