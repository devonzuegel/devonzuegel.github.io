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

// Percentile is the percentage of imported artists with strictly fewer plays.
// Artists tied on play count receive the same percentile.
export function historyPercentile(artist, artists) {
  const values = Object.values(artists).filter(a => Number.isFinite(a.plays));
  if (!values.length) return 0;
  return Math.round(values.filter(a => a.plays < artist.plays).length / values.length * 1000) / 10;
}

export function importFileMetadata(file, doc, summary) {
  const rows = Array.isArray(doc)
    ? doc
    : doc?.plays || doc?.streamingHistory || [];
  let first = null,
    last = null;
  for (const row of rows) {
    const raw = row.ts || row.endTime;
    if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw)) continue;
    const date = new Date(
      raw.includes("T") ? raw : raw.replace(" ", "T") + ":00Z",
    );
    if (!Number.isFinite(+date)) continue;
    const stamp = date.toISOString();
    if (!first || stamp < first) first = stamp;
    if (!last || stamp > last) last = stamp;
  }
  return {
    name: file.name,
    size: file.size,
    type: file.type || "application/json",
    modifiedAt: file.lastModified
      ? new Date(file.lastModified).toISOString()
      : null,
    records: rows.length,
    plays: summary.count,
    artists: Object.keys(summary.artists).length,
    first,
    last,
    format: rows.some((row) => "master_metadata_album_artist_name" in row)
      ? "Extended streaming history"
      : "Streaming history",
  };
}
