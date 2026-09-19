import test from "node:test";
import assert from "node:assert/strict";
import { searchArchive } from "../shared/archive.js";
test("live search includes performance videos without the word live and live audio outside etree", async () => {
  const queries = [];
  const fake = async (url) => {
    queries.push(url.searchParams.get("q"));
    return new Response(
      JSON.stringify({
        response: {
          numFound: 1,
          docs: [
            {
              identifier: "sample",
              title: "Artist at Music Hall",
              mediatype: queries.length === 1 ? "movies" : "audio",
            },
          ],
        },
      }),
    );
  };
  const r = await searchArchive("Artist", "live", 1, "", fake);
  assert.equal(r.items[0].kind, "video");
  assert.ok(!queries[0].includes("title:live"));
  assert.ok(queries[1].includes("collection:etree OR title:live"));
});
test("one failed media source still returns usable results; two failures surface an error", async () => {
  const fake = async (url) => {
    if (url.searchParams.get("q").includes("mediatype:movies"))
      throw Error("down");
    return new Response(
      JSON.stringify({ response: { numFound: 0, docs: [] } }),
    );
  };
  assert.equal(
    (await searchArchive("Artist", "live", 1, "", fake)).items.length,
    0,
  );
  await assert.rejects(
    searchArchive("Artist", "live", 1, "", async () => {
      throw Error("down");
    }),
  );
});
