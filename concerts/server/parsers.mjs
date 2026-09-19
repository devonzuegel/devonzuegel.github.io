import * as cheerio from "cheerio";
import {
  hash,
  normalize,
  localToISO,
  dayInZone,
  safeURL,
} from "../shared/core.js";
export const clean = (s) =>
  String(s || "")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const validDay = (day) => {
  const date = new Date(day + "T12:00:00Z");
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === day
    ? day
    : null;
};
export function parseDate(text, now = new Date()) {
  let s = clean(text).replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  const iso = s.match(/\b(20\d\d)-(\d\d)-(\d\d)\b/);
  if (iso) return validDay(iso[0]);
  const compact = s.match(/^20\d{6}$/);
  if (compact)
    return validDay(s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6, 8));
  let year = s.match(/\b(20\d\d)\b/)?.[1],
    month,
    day;
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const word = s.match(
    /\b(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)[\s,]+(\d{1,2})\b/i,
  );
  const reversed = s.match(
    /\b(\d{1,2})\s+(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)\b/i,
  );
  const numeric = s.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](20\d\d))?\b/);
  if (word) {
    month = months.indexOf(word[1].slice(0, 3).toLowerCase()) + 1;
    day = +word[2];
  } else if (reversed) {
    month = months.indexOf(reversed[2].slice(0, 3).toLowerCase()) + 1;
    day = +reversed[1];
  } else if (numeric) {
    month = +numeric[1];
    day = +numeric[2];
    year ||= numeric[3];
  } else return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (!year) {
    year = now.getUTCFullYear();
    const base = new Date(Date.UTC(year, month - 1, day));
    const delta = (base - now) / 86400000;
    if (delta < -120) year++;
    else if (delta > 300) year--;
  }
  const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return validDay(value);
}
export function parseTime(text) {
  const m = clean(text).match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!m || +m[1] < 1 || +m[1] > 12 || +(m[2] || 0) > 59) return null;
  const h = (+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${m[2] || "00"}`;
}
const stripStatus = (s) =>
  clean(s).replace(
    /^\*?(sold out|cancelled|canceled|postponed)\*?\s*[-:–]?\s*/i,
    "",
  );
export function normalizeGenres(values = []) {
  const tags = values.join(" ").toLowerCase();
  const rules = [
    ["Rock", /rock|shoegaze|grunge|psych|garage/],
    ["Indie", /indie|alternative/],
    ["Pop", /pop/],
    [
      "Electronic",
      /electro|dance|techno|house|trance|bass|disco|ambient|edm|club|dj/,
    ],
    ["Hip-hop", /hip.?hop|rap/],
    ["R&B / Soul", /r&b|rhythm|soul/],
    ["Jazz", /jazz/],
    ["Folk / Acoustic", /folk|acoustic|singer.songwriter/],
    ["Country / Americana", /country|americana|bluegrass/],
    ["Metal", /metal|doom|thrash/],
    ["Punk", /punk|hardcore/],
    ["Latin", /latin|salsa|cumbia|reggaeton|bossa|brazil/],
    ["Reggae", /reggae|ska|dub\b/],
    ["Funk", /funk/],
    ["Blues", /blues/],
    ["Classical", /classical|orchestra|chamber|opera/],
    ["World", /world|afro|global/],
    ["Experimental", /experimental|noise|avant/],
    ["Tribute", /tribute/],
  ];
  return rules.filter(([, r]) => r.test(tags)).map(([name]) => name);
}
const artists = (s) =>
  [
    ...new Set(
      (Array.isArray(s)
        ? s
        : String(s || "")
            .replace(/^(with|supporting talent:)\s*/i, "")
            .split(/,\s*/)
      )
        .map(clean)
        .filter(Boolean),
    ),
  ].map((name) => ({ name }));
export function makeEvent(venue, input, now = new Date()) {
  const title = stripStatus(input.title);
  if (
    (input.genres || []).some((g) =>
      /^(sports|comedy|theatre|theater|lecture)/i.test(g),
    )
  )
    return null;
  if (!title || title.length > 300 || !input.date) return null;
  const status = /cancelled|canceled/i.test(input.status || input.title)
    ? "cancelled"
    : /postponed/i.test(input.status || input.title)
      ? "postponed"
      : /sold\s*out/i.test(input.status || input.title)
        ? "soldout"
        : "scheduled";
  const url = safeURL(input.url) || venue.url;
  const ids = url.match(/ticketmaster\.com\/event\/([A-Za-z0-9]+)/i);
  const id = input.id || (ids ? "tm-" + ids[1] : venue.id + "-" + hash(url));
  const v = { ...venue };
  delete v.parser;
  delete v.rooms;
  if (input.room) {
    v.room = input.room;
    const room = venue.rooms?.[input.room];
    if (room) {
      v.id = venue.id + "-" + hash(input.room);
      v.capacity = room;
      v.layout = room.configuration;
    } else if (venue.id === "elsewhere") v.capacity = null;
  }
  const actual = clean(
    input.venueName || title.match(/^MOVED TO (?:THE )?([^:]+):/i)?.[1],
  );
  if (
    actual &&
    normalize(actual).replace(/^the /, "") !==
      normalize(venue.name).replace(/^the /, "")
  ) {
    Object.assign(v, {
      id: "venue-" + hash(actual),
      name: actual,
      room: null,
      lat: null,
      lng: null,
      address: input.address || "",
      locality: "",
      capacity: null,
      layout: null,
      locationSource: null,
    });
  }

  const startAt =
    input.startAt ||
    (input.time ? localToISO(input.date, input.time, venue.timezone) : null);
  return {
    id,
    title,
    artists: input.artists?.length ? artists(input.artists) : artists([title]),
    date: input.date,
    time: input.time || null,
    timeKind: input.timeKind || "show",
    startAt,
    endAt: input.endAt || null,
    timezone: venue.timezone,
    metro: venue.metro,
    venue: v,
    genres: normalizeGenres(input.genres),
    sourceGenres: (input.genres || []).map(clean).filter(Boolean),
    image: safeURL(input.image),
    ticketUrl: safeURL(input.ticketUrl) || url,
    status,
    sources: [{ name: venue.name, url }],
    sourceId: venue.id,
    fetchedAt: now.toISOString(),
    ...input.extra,
  };
}
export function parseVenue(venue, html, now = new Date()) {
  const $ = cheerio.load(html),
    out = [];
  const add = (x) => {
    const e = makeEvent(venue, x, now);
    if (e) out.push(e);
  };
  const text = (e, s) => clean(e.find(s).text());
  const abs = (s) => {
    try {
      return new URL(s, venue.url).href;
    } catch {
      return "";
    }
  };
  switch (venue.parser) {
    case "ticketweb":
      $(".tw-section").each((i, node) => {
        const e = $(node),
          title = text(e, ".tw-name"),
          date = parseDate(text(e, ".tw-event-date, .tw-date"), now);
        const times = text(e, ".tw-event-time");
        const acts = e
          .find(".tw-attractions span")
          .map((i, a) => clean($(a).text()))
          .get();
        add({
          title,
          date,
          time: parseTime(times),
          timeKind: /doors/i.test(times) ? "doors" : "show",
          artists: [
            stripStatus(title).replace(
              /\s+[–—:]\s+.*(?:tour|anniversary|presents).*/i,
              "",
            ),
            ...acts,
          ],
          venueName: text(e, ".tw-venue-name:not(.tw-venue-address)"),
          url: e.find(".tw-name a").attr("href"),
          ticketUrl: e
            .find(
              'a.tw-buy-tix-btn,a[href*="ticketmaster.com/event/"],a[href*="ticketweb.com/event/"]',
            )
            .first()
            .attr("href"),
          image: e.find(".tw-image img").attr("src"),
          status: text(e, ".tw-info-price-buy-tix"),
        });
      });
      break;
    case "see":
      $(".seetickets-list-event-container").each((i, node) => {
        const e = $(node),
          title = text(e, ".title");
        add({
          title,
          date: parseDate(text(e, ".date"), now),
          time: parseTime(text(e, ".see-showtime")),
          artists: [
            ...artists(text(e, ".headliners") || title).map((a) => a.name),
            ...artists(text(e, ".supporting-talent")).map((a) => a.name),
          ],
          url: e.find(".title a").attr("href"),
          image: e.find("img").first().attr("src"),
          genres: [text(e, ".genre")],
          venueName:
            title.match(/^MOVED TO (?:THE )?([^:]+):/i)?.[1] ||
            text(e, ".venue").replace(/^at /i, ""),
          status: text(e, ".seetickets-buy-btn"),
        });
      });
      break;
    case "bottom":
      $("a[name]").each((i, node) => {
        const date = parseDate($(node).attr("name"), now);
        if (!date) return;
        const e = $(node).closest("tr");
        const acts = e
          .find(".band")
          .map((i, a) => clean($(a).text()).replace(/^\/\s*/, ""))
          .get()
          .filter(Boolean);
        if (!acts.length) return;
        const times = text(e, ".time").replace(/\s*:\s*/g, ":");
        const t = times.match(/music\s+at\s+(.*)/i)?.[1];
        add({
          id: venue.id + "-" + date,
          title: acts[0],
          date,
          time: parseTime(t || times),
          timeKind: t ? "show" : "doors",
          artists: acts,
          genres: e
            .find(".genre")
            .map((i, a) => clean($(a).text()))
            .get(),
          url: `https://www.bottomofthehill.com/${date.replaceAll("-", "")}.html`,
          ticketUrl: e
            .find('a[href*="dice.fm"],a[href*="stubmatic"],a[href*="ticket"]')
            .first()
            .attr("href"),
          image: e
            .find('img[src*="/f/"]')
            .first()
            .attr("src")
            ?.replace("http:", "https:"),
        });
      });
      break;
    case "lpr":
      $(".event[dateofevent]").each((i, node) => {
        const e = $(node);
        if (!/^(Main Space|Gallery Bar)$/i.test(text(e, ".spaceTitle"))) return;
        add({
          title: text(e, ".black_visible") || text(e, ".entry-title"),
          date: parseDate(e.attr("dateofevent")),
          time: parseTime(text(e, ".time")),
          url: e.find(".eventSingleLink").attr("href"),
          ticketUrl: e.find(".buy_now_link a").attr("href"),
          room: text(e, ".spaceTitle"),
          image: e
            .find(".event_image")
            .attr("style")
            ?.match(/url\(['"]?([^)'";]+)/)?.[1],
        });
      });
      break;
    case "elsewhere": {
      const p = JSON.parse($("#__NEXT_DATA__").text() || "{}").props?.pageProps
        ?.initialEventData;
      for (const e of p?.events || []) {
        const start = new Date(e.start_date);
        if (Number.isNaN(+start)) continue;
        const time = new Intl.DateTimeFormat("en-GB", {
          timeZone: venue.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(start);
        add({
          id: `elsewhere-${e.new_id || e.id}`,
          title: e.name,
          artists: e.artists,
          date: dayInZone(start, venue.timezone),
          time,
          startAt: start.toISOString(),
          endAt: e.end_date ? new Date(e.end_date).toISOString() : null,
          url: e.ticket_url,
          ticketUrl: e.ticket_url,
          room: (e.venues || []).join(", "),
          venueName: e.elsewhere_presents ? (e.venues || []).join(", ") : "",
          address: e.address,
          genres: e.genres,
          image: e.image_urls?.[0],
          status: e.sold_out ? "sold out" : "",
        });
      }
      break;
    }
    case "tribe": {
      const data = typeof html === "string" ? JSON.parse(html) : html;
      for (const e of data.events || []) {
        if (
          /cleanup|yoga|meditation|film screening|movie night|workshop/i.test(
            e.title,
          )
        )
          continue;
        add({
          id: venue.id + "-" + e.id,
          title: cheerio.load(e.title).text(),
          date: e.start_date?.slice(0, 10),
          time: e.all_day ? null : e.start_date?.slice(11, 16),
          startAt: e.all_day ? null : e.utc_start_date?.replace(" ", "T") + "Z",
          endAt: e.all_day ? null : e.utc_end_date?.replace(" ", "T") + "Z",
          url: e.url,
          image: e.image?.url,
          genres: [],
        });
      }
      break;
    }
    case "revolution":
      $(".event-list__list-item").each((i, node) => {
        const e = $(node);
        const a = e.find(".listen-now a").attr("href");
        const title = text(e, ".event-list__title");
        add({
          title,
          date: parseDate(text(e, ".event-list__date"), now),
          time: parseTime(text(e, ".event-list__time")),
          timeKind: "doors",
          url: e.find(".event-list__title-link").attr("href"),
          ticketUrl: e.find(".event__button a").attr("href"),
          image: e.attr("data-hidefarimageurl"),
          extra: a
            ? {
                artists: [
                  {
                    name: title,
                    spotifyId: a.split("/artist/")[1]?.split("?")[0],
                  },
                ],
              }
            : {},
        });
      });
      break;
    case "zeyzey":
      $(".event-card").each((i, node) => {
        const e = $(node),
          dt = text(e, ".date-time-div");
        const split = [
          e
            .find(".date-time-div")
            .children()
            .slice(0, 3)
            .map((i, n) => clean($(n).text()))
            .get()
            .join(" "),
          e.find(".date-time-div").children().last().text(),
        ];
        add({
          title: text(e, "h3"),
          date: parseDate(split[0], now),
          time: parseTime(split[1]),
          url: abs(e.find("a").first().attr("href")),
          image: e.find("img").attr("src"),
          genres: [text(e, ".genre-div")],
        });
      });
      break;
    case "culture":
      $(".item-details").each((i, node) => {
        const e = $(node),
          href = e
            .find('a[href*="ticketmaster.com/event/"]')
            .first()
            .attr("href");
        if (!href) return;
        const body = clean(e.text());
        const heading = e
          .find("h1,h2,h3")
          .map((i, a) => clean($(a).text()))
          .get()
          .filter(Boolean);
        const date = parseDate(body, now);
        const title = text(e, ".preview-subtitle");
        if (title)
          add({
            title,
            date,
            time: parseTime(body.match(/doors open\s*(.*)/i)?.[1]),
            timeKind: "doors",
            url: href,
            image: e
              .find('[style*="background-image"]')
              .first()
              .attr("style")
              ?.match(/url\(['"]?([^)'";]+)/)?.[1],
          });
      });
      break;
    case "lagniappe":
      $(".paragraph").each((i, node) => {
        const e = $(node);
        const segments =
          e
            .html()
            ?.split(/<br\s*\/?\s*>/i)
            .map((x) => clean(cheerio.load(x).text()))
            .filter(Boolean) || [];
        const date = parseDate(segments[0], now);
        if (!date) return;
        const title = segments[1];
        if (title)
          add({
            id: "lagniappe-" + date,
            title,
            date,
            time: "21:00",
            url: venue.url,
            genres: ["Jazz"],
            image: "",
          });
      });
      break;
    default:
      for (const script of $('script[type="application/ld+json"]').toArray()) {
        try {
          const root = JSON.parse($(script).text());
          const walk = (x) => {
            if (!x || typeof x !== "object") return;
            const type = [x["@type"]].flat().join(" ");
            if (/MusicEvent|Event/.test(type) && x.startDate) {
              const day = x.startDate.slice(0, 10);
              add({
                title: x.name,
                date: day,
                time: x.startDate.slice(11, 16) || null,
                artists: [x.performer]
                  .flat()
                  .filter(Boolean)
                  .map((a) => a.name || a),
                url: x.url,
                image: [x.image].flat()[0],
                ticketUrl: [x.offers].flat()[0]?.url,
              });
            }
            for (const v of Object.values(x)) {
              if (typeof v === "object")
                Array.isArray(v) ? v.forEach(walk) : walk(v);
            }
          };
          walk(root);
        } catch {}
      }
  }
  return [...new Map(out.map((e) => [e.id, e])).values()];
}
