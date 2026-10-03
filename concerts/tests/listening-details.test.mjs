import test from "node:test";
import assert from "node:assert/strict";
import { addHistoryDetails, historyRank } from "../shared/listening-details.js";
test("merges standard and extended histories into dated artist and track summaries", () => {
  const data = addHistoryDetails([
    {
      artistName: "ROYA",
      trackName: "Song",
      msPlayed: 60000,
      endTime: "2026-01-01 12:00",
    },
    {
      artistName: "ROYA",
      trackName: "Skip",
      msPlayed: 1000,
      endTime: "2026-01-02 12:00",
    },
  ]);
  addHistoryDetails(
    [
      {
        master_metadata_album_artist_name: "ROYA",
        master_metadata_track_name: "Song",
        ms_played: 90000,
        ts: "2026-02-01T12:00:00Z",
        spotify_track_uri: "spotify:track:ABC",
      },
    ],
    data,
  );
  const a = Object.values(data.artists)[0];
  assert.equal(a.plays, 2);
  assert.equal(a.ms, 150000);
  assert.equal(Object.values(a.tracks)[0].plays, 2);
  assert.deepEqual(a.months, { "2026-01": 1, "2026-02": 1 });
  assert.equal(a.last, "2026-02-01T12:00:00.000Z");
  assert.equal(historyRank(a, { a, b: { plays: 3 }, c: { plays: 2 } }), 2);
});
test("missing dates and tracks stay unknown rather than fabricated", () => {
  const a = Object.values(
    addHistoryDetails([{ artistName: "A", msPlayed: 30000 }]).artists,
  )[0];
  assert.equal(a.first, null);
  assert.equal(a.undated, 1);
  assert.deepEqual(a.tracks, {});
});
