import test from "node:test";
import assert from "node:assert/strict";
import { importFileMetadata } from "../shared/listening-details.js";
import { importSpotifyHistory } from "../shared/core.js";
test("records file provenance, date coverage and counted plays separately from raw rows", () => {
  const doc = [
    { endTime: "2025-01-02 12:00", artistName: "Artist", msPlayed: 60000 },
    { endTime: "2025-01-03 12:00", artistName: "Artist", msPlayed: 1000 },
  ];
  const result = importFileMetadata(
    {
      name: "history.json",
      size: 2048,
      type: "application/json",
      lastModified: 1000,
    },
    doc,
    importSpotifyHistory(doc),
  );
  assert.equal(result.name, "history.json");
  assert.equal(result.size, 2048);
  assert.equal(result.records, 2);
  assert.equal(result.plays, 1);
  assert.equal(result.artists, 1);
  assert.equal(result.first, "2025-01-02T12:00:00.000Z");
  assert.equal(result.last, "2025-01-03T12:00:00.000Z");
  assert.equal(result.modifiedAt, "1970-01-01T00:00:01.000Z");
});
test("extended history metadata tolerates absent or invalid dates", () => {
  const doc = {
    plays: [
      {
        ts: "invalid",
        master_metadata_album_artist_name: "Artist",
        ms_played: 40000,
      },
    ],
  };
  const result = importFileMetadata(
    { name: "extended.json", size: 100 },
    doc,
    importSpotifyHistory(doc),
  );
  assert.equal(result.format, "Extended streaming history");
  assert.equal(result.first, null);
  assert.equal(result.modifiedAt, null);
});
