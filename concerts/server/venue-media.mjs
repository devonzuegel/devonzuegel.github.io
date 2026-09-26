import * as cheerio from "cheerio";
import { json } from "./network.mjs";
import { searchMedia } from "./media.mjs";
import * as store from "./storage.mjs";
import { hash } from "../shared/core.js";

export async function venueMedia(venue) {
  const key = `venue-media:v3:${hash(venue.name + ":" + venue.locality)}`;
  const cached = await store.get(key).catch(() => null);
  if (cached && Date.now() - cached.at < 86400000) return cached.data;
  const [photos, videos] = await Promise.allSettled([
    (async () => {
      if (venue.name.toLowerCase() === "mana wynwood")
        return [
          {
            title: "Sound Stadium · indoor space",
            thumbnail:
              "https://manawynwood.com/wp-content/uploads/2025/04/BLACKROOM.png",
            url: "https://manawynwood.com/event-spaces/",
            credit: "Mana Wynwood",
            license: "Official venue",
          },
          {
            title: "III Points · festival grounds (2022)",
            thumbnail:
              "https://manawynwood.com/wp-content/uploads/2026/04/IIIPOINTS2022_1022_220807-9421_ADINAYEV-scaled.jpg",
            url: "https://manawynwood.com/event-spaces/",
            credit: "ADINAYEV / Mana Wynwood",
            license: "Official venue",
          },
        ];
      const url = new URL("https://commons.wikimedia.org/w/api.php");
      Object.entries({
        action: "query",
        format: "json",
        generator: "search",
        gsrsearch: `intitle:"${venue.name.replaceAll('"', "")}" ${venue.locality || ""} filetype:bitmap`,
        gsrnamespace: "6",
        gsrlimit: "6",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "640",
      }).forEach(([k, v]) => url.searchParams.set(k, v));
      const data = await json(url);
      return Object.values(data.query?.pages || {})
        .map((page) => {
          const info = page.imageinfo?.[0];
          if (!info?.thumburl || !info?.descriptionurl) return null;
          return {
            title: page.title.replace(/^File:/, ""),
            thumbnail: info.thumburl,
            url: info.descriptionurl,
            credit: cheerio
              .load(info.extmetadata?.Artist?.value || "")("body")
              .text()
              .trim(),
            license:
              info.extmetadata?.LicenseShortName?.value || "Source & license",
          };
        })
        .filter(Boolean);
    })(),
    process.env.YOUTUBE_API_KEY
      ? searchMedia({
          artist: venue.name,
          query: `"${venue.name}" ${venue.locality || ""} venue tour live`,
        })
      : Promise.resolve({ items: [] }),
  ]);
  const data = {
    photoSource:
      venue.name.toLowerCase() === "mana wynwood"
        ? "Official venue"
        : "Wikimedia Commons search results",
    photos: photos.status === "fulfilled" ? photos.value : [],
    videos:
      videos.status === "fulfilled"
        ? videos.value.items
            .filter((i) => i.provider === "youtube")
            .slice(0, 6)
            .map((i) => ({ ...i, title: cheerio.load(i.title)("body").text() }))
        : [],
    photosUnavailable: photos.status === "rejected",
    videosUnavailable:
      videos.status === "rejected" ||
      !process.env.YOUTUBE_API_KEY ||
      videos.value?.provider === "archive",
  };
  // Retry transient failures on the next visit rather than caching empty failures.
  if (!data.photosUnavailable && !data.videosUnavailable)
    await store.set(key, { at: Date.now(), data }).catch(() => {});
  return data;
}
