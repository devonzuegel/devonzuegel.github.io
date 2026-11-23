// Only remove scheduling labels, never musical qualifiers (acoustic, tribute, etc.).
const norm = s => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const labelPattern = /\s*\((sunset|early|late) show\)\s*$/i;
export const performerName = name => String(name || '').replace(labelPattern, '').trim();
export function sameShowTitle(a, b) {
  const x = a.match(labelPattern)?.[1]?.toLowerCase();
  const y = b.match(labelPattern)?.[1]?.toLowerCase();
  return !(x && y && x !== y) && !!norm(a) && norm(performerName(a)) === norm(performerName(b));
}
const present = v => v != null && v !== '';
const unique = values => [...new Map(values.map(v => [JSON.stringify(v), v])).values()];
function combine(preferred, other) {
  if (Array.isArray(preferred) || Array.isArray(other)) return unique([...(preferred || []), ...(other || [])]);
  if (preferred && other && typeof preferred === 'object' && typeof other === 'object') {
    return Object.fromEntries([...new Set([...Object.keys(other), ...Object.keys(preferred)])].map(k => [k, combine(preferred[k], other[k])]));
  }
  return present(preferred) ? preferred : other;
}
function originals(e) {
  if (e.sourceRecords?.length) return e.sourceRecords;
  const { sourceRecords, ...record } = e;
  return [record];
}
// Keep complete source records as well as a combined display record. No discarded
// values, nested provenance, alternate URLs or prior aliases disappear on merge.
export function mergeEventRecords(a, b) {
  const official = e => e.sourceId && e.sourceId === e.venue?.id && !e.provenance?.time?.secondary;
  const preferB = !official(a) && official(b);
  const primary = preferB ? b : a, secondary = preferB ? a : b;
  const result = combine(primary, secondary);
  result.id = primary.id;
  if ("missingFromFeed" in a || "missingFromFeed" in b) result.missingFromFeed = !!a.missingFromFeed && !!b.missingFromFeed;
  result.aliases = [...new Set([a.id, b.id, ...(a.aliases || []), ...(b.aliases || [])])].filter(id => id !== result.id);
  result.sourceRecords = unique([...originals(a), ...originals(b)]);
  result.sources = unique([...(a.sources || []), ...(b.sources || []), ...[a, b].filter(e => e.ticketUrl).map(e => ({ name: 'Tickets', url: e.ticketUrl }))]);
  result.sources = [...new Map(result.sources.map(source => [source.url, source])).values()];
  const artists = new Map();
  for (const artist of [...(primary.artists || []), ...(secondary.artists || [])]) {
    const name = performerName(artist.name), key = norm(name);
    artists.set(key, { ...combine(artists.get(key), artist), name });
  }
  result.artists = [...artists.values()];
  if (a.time && b.time && a.time !== b.time) result.dataConflicts = unique([...(result.dataConflicts || []), { field: 'time', sources: result.sources }]);
  return result;
}
