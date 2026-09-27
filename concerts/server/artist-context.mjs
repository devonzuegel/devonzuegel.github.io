import { json } from "./network.mjs";
import * as store from "./storage.mjs";
import { hash, normalize } from "../shared/core.js";
const music =
  /\b(musician|singer|rapper|band|musical|music producer|record producer|disc jockey|DJ|composer|songwriter|duo|orchestra)\b/i;
const api = (base, params) => {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return json(u);
};
const wd = (params) =>
  api("https://www.wikidata.org/w/api.php", { format: "json", ...params });
export function matchArtist(name, results) {
  const matches = results.filter(
    (r) =>
      normalize(r.label) === normalize(name) && music.test(r.description || ""),
  );
  return matches.length === 1 ? matches[0] : null;
}
const values = (entity, prop) =>
  (entity.claims?.[prop] || [])
    .filter((c) => c.rank !== "deprecated")
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter(Boolean);
export function artistFacts(entity, labels, now = new Date()) {
  const label = (id) => labels[id]?.labels?.en?.value;
  const facts = [];
  const origin = values(entity, "P740")[0]?.id || values(entity, "P19")[0]?.id;
  if (label(origin))
    facts.push(
      `${values(entity, "P740").length ? "From" : "Born in"} ${label(origin)}`,
    );
  const born = values(entity, "P569")[0];
  if (born && !values(entity, "P570").length) {
    const day = born.time?.slice(1, 11);
    if (born.precision >= 11 && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
      const age =
        now.getUTCFullYear() -
        Number(day.slice(0, 4)) -
        (now.toISOString().slice(5, 10) < day.slice(5) ? 1 : 0);
      if (age >= 0 && age < 120) facts.push(`Age ${age}`);
    } else if (born.precision >= 9) facts.push(`Born ${born.time.slice(1, 5)}`);
  }
  const start = values(entity, "P2031")[0],
    formed = values(entity, "P571")[0];
  const since = start || formed;
  if (since?.precision >= 9)
    facts.push(
      `${start ? "Active since" : "Formed"} ${since.time.slice(1, 5)}`,
    );
  return {
    facts,
    genres: values(entity, "P136")
      .map((v) => label(v.id))
      .filter(Boolean)
      .slice(0, 4),
  };
}
export async function artistContext(name, now = new Date()) {
  if (typeof name !== "string" || !name.trim() || name.length > 180)
    throw Object.assign(new Error("Invalid artist name."), { status: 400 });
  const cacheKey = "artist-context:v1:" + hash(normalize(name));
  const cached = await store.get(cacheKey).catch(() => null);
  if (cached && +now - cached.at < 7 * 86400000) return cached.data;
  const results = await wd({
    action: "wbsearchentities",
    search: name,
    language: "en",
    limit: 8,
    type: "item",
  });
  const match = matchArtist(name, results.search || []);
  if (!match) {
    const data = { name, found: false };
    await store.set(cacheKey, { at: +now, data }).catch(() => {});
    return data;
  }
  const entity = (
    await wd({
      action: "wbgetentities",
      ids: match.id,
      props: "claims|sitelinks|descriptions",
      languages: "en",
    })
  ).entities?.[match.id];
  if (!entity) throw new Error("Artist information unavailable.");
  const title = entity.sitelinks?.enwiki?.title;
  const ids = [
    ...new Set(
      ["P19", "P740", "P136"]
        .flatMap((p) => values(entity, p).map((v) => v.id))
        .filter(Boolean),
    ),
  ];
  const end = new Date(+now - 2 * 86400000),
    start = new Date(+end - 29 * 86400000);
  const stamp = (d) => d.toISOString().slice(0, 10).replaceAll("-", "");
  const [labelResult, bioResult, viewsResult] = await Promise.allSettled([
    ids.length
      ? wd({
          action: "wbgetentities",
          ids: ids.join("|"),
          props: "labels",
          languages: "en",
        })
      : Promise.resolve({ entities: {} }),
    title
      ? api("https://en.wikipedia.org/w/api.php", {
          action: "query",
          format: "json",
          prop: "extracts",
          titles: title,
          exintro: "1",
          explaintext: "1",
          exchars: "600",
        })
      : Promise.resolve({}),
    title
      ? json(
          `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/${encodeURIComponent(title.replaceAll(" ", "_"))}/daily/${stamp(start)}/${stamp(end)}`,
        )
      : Promise.resolve({}),
  ]);
  const labels =
    labelResult.status === "fulfilled" ? labelResult.value.entities : {};
  const extract =
    bioResult.status === "fulfilled"
      ? Object.values(bioResult.value.query?.pages || {})[0]?.extract
      : "";
  const viewDays =
    viewsResult.status === "fulfilled" ? viewsResult.value.items : null;
  const data = {
    name,
    found: true,
    description: match.description,
    bio: extract || "",
    ...artistFacts(entity, labels, now),
    popularity:
      viewDays?.length === 30
        ? {
            views: viewDays.reduce((n, d) => n + d.views, 0),
            from: start.toISOString().slice(0, 10),
            to: end.toISOString().slice(0, 10),
          }
        : null,
    source: `https://www.wikidata.org/wiki/${match.id}`,
    bioSource: title
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`
      : null,
    updatedAt: now.toISOString(),
  };
  await store.set(cacheKey, { at: +now, data }).catch(() => {});
  return data;
}
