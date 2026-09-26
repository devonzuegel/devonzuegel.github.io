import * as cheerio from "cheerio";
import { makeEvent, clean, parseDate } from "./parsers.mjs";

// Only accept an explicitly published year. Festival sites often retain old
// structured data and lineups after announcing next year's dates.
export function festivalRange(text) {
  const month =
    "(?:Jan[a-z]*|Feb[a-z]*|Mar[a-z]*|Apr[a-z]*|May|Jun[a-z]*|Jul[a-z]*|Aug[a-z]*|Sep[a-z]*|Oct[a-z]*|Nov[a-z]*|Dec[a-z]*)";
  const s = clean(text);
  const repeated = s.match(
    new RegExp(
      `(${month}) (\\d{1,2}) and (?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),? (${month}) (\\d{1,2}),? (20\\d{2})`,
      "i",
    ),
  );
  const range = s.match(
    new RegExp(
      `(${month})\\s*(\\d{1,2})(?:\\s*[-–—•.]\\s*\\d{1,2})*\\s*[-–—•.]\\s*(\\d{1,2}),?\\s+(20\\d{2})`,
      "i",
    ),
  );
  let date, endDate;
  if (repeated) {
    date = parseDate(`${repeated[1]} ${repeated[2]}, ${repeated[5]}`);
    endDate = parseDate(`${repeated[3]} ${repeated[4]}, ${repeated[5]}`);
  } else if (range) {
    date = parseDate(`${range[1]} ${range[2]}, ${range[4]}`);
    endDate = parseDate(`${range[1]} ${range[3]}, ${range[4]}`);
  }
  if (
    !date ||
    !endDate ||
    endDate < date ||
    (Date.parse(endDate) - Date.parse(date)) / 86400000 > 14
  )
    throw new Error("No valid, explicitly dated festival range was published.");
  return { date, endDate };
}

export function parseFestival(
  source,
  html,
  { lineupHTML = "", now = new Date() } = {},
) {
  const $ = cheerio.load(html);
  $("script,style,noscript").remove();
  let dateText = clean($("body").text());
  if (["festival-iii", "festival-govball"].includes(source.id))
    dateText = $("title").text();
  if (source.id === "festival-ultra")
    dateText =
      $("a")
        .toArray()
        .map((el) => clean($(el).text()))
        .find((t) => /^ULTRA Miami/i.test(t) && /20\d\d/.test(t)) || "";
  const range = festivalRange(dateText);
  let artists = [];
  if (source.id === "festival-iii" && lineupHTML) {
    const lineup = cheerio.load(lineupHTML);
    if (lineup("title").text().includes(range.date.slice(0, 4)))
      artists = [
        ...new Set(
          lineup("[data-artist-name]")
            .toArray()
            .map((el) => clean(lineup(el).attr("data-artist-name")))
            .filter(Boolean),
        ),
      ];
  }
  if (source.id === "festival-hsb" && lineupHTML) {
    const lineup = cheerio.load(lineupHTML);
    if (lineup("title").text().includes(range.date.slice(0, 4)))
      artists = [
        ...new Set(
          lineup(".inside .name")
            .toArray()
            .map((el) => clean(lineup(el).text()))
            .filter(Boolean),
        ),
      ];
  }
  const venue = {
    id: source.id + "-grounds",
    name: source.venueName,
    metro: source.metro,
    timezone: source.timezone,
    locality: source.locality,
    address: source.venueName + ", " + source.locality,
    lat: null,
    lng: null,
    capacity: null,
    layout: "Outdoor festival grounds",
    url: source.url,
  };
  return makeEvent(
    venue,
    {
      id: `${source.id}-${range.date}`,
      title: source.name,
      date: range.date,
      artists,
      url: source.url,
      image: $('meta[property="og:image"]').attr("content") || null,
      extra: {
        endDate: range.endDate,
        eventType: "festival",
        sourceId: source.id,
        sources: [
          { name: source.name + " · official festival", url: source.url },
        ],
        lineupPublished: artists.length > 0,
      },
    },
    now,
  );
}

export async function readFestival(source, now, read) {
  let html = await read(source.url),
    pages = 1;
  if (source.id === "festival-hsb") {
    const $ = cheerio.load(html);
    const href = $("a[href]")
      .toArray()
      .map((el) => $(el).attr("href"))
      .find((h) => /\/info-faq-20\d{2}\/?$/.test(h));
    if (!href)
      throw new Error("Current festival information page was not found.");
    const url = new URL(href, source.url);
    if (url.origin !== new URL(source.url).origin)
      throw new Error("Unexpected festival information domain.");
    html = await read(url.href);
    pages++;
  }
  let lineupHTML = "";
  if (source.id === "festival-iii") {
    // Dates remain useful if the optional lineup page is temporarily unavailable.
    try {
      lineupHTML = await read(new URL("/lineup/", source.url).href);
      pages++;
    } catch {}
  }
  if (source.id === "festival-hsb") {
    const year = festivalRange(
      clean(cheerio.load(html)("body").text()),
    ).date.slice(0, 4);
    try {
      lineupHTML = await read(new URL(`/${year}-2/`, source.url).href);
      pages++;
    } catch {}
  }
  return {
    events: [parseFestival(source, html, { lineupHTML, now })],
    pages,
    hasMore: false,
  };
}
