import { json } from "./network.mjs";
import { searchArchive } from "../shared/archive.js";
import * as store from "./storage.mjs";
import { hash } from "../shared/core.js";
export async function searchMedia({
  artist,
  mode = "live",
  page = 1,
  query = "",
  pageToken = "",
}) {
  if (!artist || artist.length > 180 || query.length > 180)
    throw Object.assign(
      new Error("Enter an artist name under 180 characters."),
      { status: 400 },
    );
  const cache =
    "media:v2:" +
    hash(
      JSON.stringify({
        artist,
        mode,
        page,
        query,
        pageToken,
        yt: !!process.env.YOUTUBE_API_KEY,
      }),
    );
  let cached;
  try {
    cached = await store.get(cache);
  } catch {}
  if (cached && Date.now() - cached.at < 24 * 3600000) return cached.data;
  let data;
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const u = new URL("https://www.googleapis.com/youtube/v3/search");
      Object.entries({
        key: process.env.YOUTUBE_API_KEY,
        part: "snippet",
        type: "video",
        maxResults: 12,
        videoEmbeddable: "true",
        videoSyndicated: "true",
        q:
          query ||
          `${artist}${mode === "all" ? " music" : mode === "full" ? " full concert" : " live performance"}`,
        ...(mode === "full" ? { videoDuration: "long" } : {}),
        ...(pageToken ? { pageToken } : {}),
      }).forEach(([k, v]) => u.searchParams.set(k, v));
      const r = await json(u);
      const ids = r.items?.map((i) => i.id.videoId).filter(Boolean) || [];
      let durations = {};
      if (ids.length) {
        const v = new URL("https://www.googleapis.com/youtube/v3/videos");
        Object.entries({
          key: process.env.YOUTUBE_API_KEY,
          part: "contentDetails",
          id: ids.join(","),
        }).forEach(([k, val]) => v.searchParams.set(k, val));
        try {
          durations = Object.fromEntries(
            (await json(v)).items.map((i) => [i.id, i.contentDetails.duration]),
          );
        } catch {}
      }
      data = {
        provider: "youtube",
        items: (r.items || []).map((i) => ({
          id: i.id.videoId,
          title: i.snippet.title,
          channel: i.snippet.channelTitle,
          thumbnail: i.snippet.thumbnails?.medium?.url,
          url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
          embed: `https://www.youtube-nocookie.com/embed/${i.id.videoId}`,
          provider: "youtube",
          kind: "video",
          duration: durations[i.id.videoId] || null,
        })),
        hasMore: !!r.nextPageToken,
        nextPageToken: r.nextPageToken,
      };
    } catch {
      data = await searchArchive(artist, mode, page, query);
      data.notice =
        "YouTube search is temporarily unavailable. Showing available Internet Archive recordings.";
    }
  } else data = await searchArchive(artist, mode, page, query);
  try {
    await store.set(cache, { at: Date.now(), data });
  } catch {}
  return data;
}
