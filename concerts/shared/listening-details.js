import { normalize } from "./core.js";
export function addHistoryDetails(
  doc,
  result = { artists: {}, first: null, last: null },
) {
  const rows = Array.isArray(doc) ? doc : doc?.plays || doc?.streamingHistory;
  if (!Array.isArray(rows))
    throw new Error("Choose Spotify streaming-history JSON files.");
  for (const row of rows) {
    const raw = row.ts || row.endTime;
    const date =
      raw && new Date(raw.includes("T") ? raw : raw.replace(" ", "T") + ":00Z");
    const stamp = date && Number.isFinite(+date) ? date.toISOString() : null;
    if (stamp) {
      if (!result.first || stamp < result.first) result.first = stamp;
      if (!result.last || stamp > result.last) result.last = stamp;
    }
    const name = row.master_metadata_album_artist_name || row.artistName;
    const ms = Number(row.ms_played ?? row.msPlayed);
    if (!name || !Number.isFinite(ms) || ms < 30000) continue;
    const a = (result.artists[normalize(name)] ||= {
      name,
      plays: 0,
      ms: 0,
      tracks: {},
      months: {},
      first: null,
      last: null,
      undated: 0,
    });
    a.plays++;
    a.ms += ms;
    if (stamp) {
      if (!a.first || stamp < a.first) a.first = stamp;
      if (!a.last || stamp > a.last) a.last = stamp;
      const month = stamp.slice(0, 7);
      a.months[month] = (a.months[month] || 0) + 1;
    } else a.undated++;
    const title = row.master_metadata_track_name || row.trackName;
    if (title) {
      const key = normalize(title);
      const t = (a.tracks[key] ||= { name: title, plays: 0, ms: 0, uri: null });
      t.plays++;
      t.ms += ms;
      if (/^spotify:track:[a-zA-Z0-9]+$/.test(row.spotify_track_uri || ""))
        t.uri = row.spotify_track_uri;
    }
  }
  return result;
}
export function historyRank(artist, artists) {
  return (
    1 + Object.values(artists).filter((a) => a.plays > artist.plays).length
  );
}
