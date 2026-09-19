export async function searchArchive(
  artist,
  mode = "live",
  page = 1,
  query = "",
  fetcher = fetch,
) {
  const term = String(query || artist)
    .replace(/["\\]/g, " ")
    .trim()
    .slice(0, 180);
  if (!term) return { items: [], hasMore: false, provider: "archive" };
  const match = `(creator:"${term}" OR title:"${term}")`;
  const queryFor = (type) =>
    `${match} AND mediatype:${type === "video" ? "movies" : "audio"}${type === "audio" && mode !== "all" ? " AND (collection:etree OR title:live OR title:concert OR title:session)" : ""}${type === "video" && mode === "full" ? ' AND (title:"full concert" OR title:"full set" OR title:"full show" OR title:concert)' : ""}`;
  async function search(type) {
    const url = new URL("https://archive.org/advancedsearch.php");
    Object.entries({
      q: queryFor(type),
      output: "json",
      rows: 8,
      page: Math.min(20, Math.max(1, page)),
      "sort[]": "downloads desc",
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    ["identifier", "title", "creator", "mediatype", "date"].forEach((v) =>
      url.searchParams.append("fl[]", v),
    );
    const r = await fetcher(url, { signal: AbortSignal.timeout(18000) });
    if (!r.ok)
      throw new Error("The recording archive is temporarily unavailable.");
    const data = await r.json();
    return data.response;
  }
  const parts = await Promise.allSettled([search("video"), search("audio")]);
  const good = parts
    .filter((p) => p.status === "fulfilled")
    .map((p) => p.value);
  if (!good.length)
    throw new Error(
      "The recording archive is temporarily unavailable. Try again.",
    );
  const items = good.flatMap((p) =>
    (p.docs || []).map((d) => ({
      id: d.identifier,
      title: d.title,
      channel: [d.creator].flat().filter(Boolean).join(", "),
      kind: d.mediatype === "movies" ? "video" : "audio",
      provider: "archive",
      thumbnail: `https://archive.org/services/img/${encodeURIComponent(d.identifier)}`,
      url: `https://archive.org/details/${encodeURIComponent(d.identifier)}`,
      embed: `https://archive.org/embed/${encodeURIComponent(d.identifier)}`,
      date: d.date || null,
    })),
  );
  items.sort(
    (a, b) =>
      (b.kind === "video") - (a.kind === "video") ||
      Number(/live|concert|session|music hall|KEXP/i.test(b.title)) -
        Number(/live|concert|session|music hall|KEXP/i.test(a.title)),
  );
  return {
    items,
    hasMore: good.some((p) => p.numFound > page * 8),
    provider: "archive",
    notice:
      "Internet Archive recordings. Videos appear first; titles and artist matches are provided by the archive. Availability varies. You can also paste a YouTube link in the search box.",
  };
}
