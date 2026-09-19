import { writeFile, mkdir } from "node:fs/promises";
import { refreshFeed } from "../server/feeds.mjs";
const feed = await refreshFeed();
await writeFile(
  new URL("../data/events.json", import.meta.url),
  JSON.stringify(feed) + "\n",
);
const lines = [
  "# Concert source coverage",
  "",
  `Checked ${feed.updatedAt}. This is a partial catalog, not every concert in each metro.`,
  "",
  "| Metro | Source | Upcoming imported | Status | Notes |",
  "| --- | --- | ---: | --- | --- |",
  ...feed.sources.map(
    (s) =>
      `| ${s.metro} | [${s.name}](${s.url}) | ${s.count} | ${s.status} | ${s.message} |`,
  ),
  "",
  "Counts reflect successful parsing, not an independent completeness audit. Each source needs to be compared against the website; pagination and inaccessible feeds are explicitly reported.",
];
await writeFile(
  new URL("../data/coverage.md", import.meta.url),
  lines.join("\n") + "\n",
);
console.log(
  JSON.stringify(
    {
      events: feed.events.length,
      sources: feed.sources.map((s) => ({
        name: s.name,
        count: s.count,
        status: s.status,
      })),
    },
    null,
    2,
  ),
);
