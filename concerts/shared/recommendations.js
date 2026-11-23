import { assessment, normalize, spotifyMatch } from './core.js?v=20261123-plan';
const features = e => ({
  artist: [...new Set((e.artists || []).map(a => normalize(a.name)).filter(Boolean))],
  genre: [...new Set((e.genres || []).filter(g => !/unknown/i.test(g)).map(normalize))],
  venue: e.venue?.id ? [e.venue.id] : [],
});
export const recommendationGroups = [
  ['planned', 'Your proposed plan'], ['saved', 'Saved options'],
  ['top', 'Top picks for you'], ['likely', 'Likely to enjoy'],
  ['explore', 'Worth exploring'], ['unlikely', 'Less likely to enjoy'],
  ['hidden', 'You marked not interested'],
];
// A transparent, per-account ranking. No profile data leaves the browser.
export function recommendConcerts(events, fields = {}, listening = {}) {
  const evidence = {artist: new Map(), genre: new Map(), venue: new Map()};
  const seen = new Set();
  let totalWeight = 0, totalChoices = 0;
  for (const event of events) {
    if ([event.id, ...(event.aliases || [])].some(id => seen.has(id))) continue;
    for (const id of [event.id, ...(event.aliases || [])]) seen.add(id);
    const a = assessment(fields, event.id);
    let weight = a.hidden ? -2 : a.planned ? 3 : a.saved ? 1.5 : 0;
    if (!a.hidden && Number.isFinite(a.music)) weight = (a.music - 3) * 1.5;
    if (!weight) continue;
    totalWeight += weight; totalChoices++;
    for (const [type, keys] of Object.entries(features(event))) for (const key of keys) {
      const entry = evidence[type].get(key) || {sum:0,count:0,positive:0,negative:0};
      entry.sum += weight; entry.count++;
      entry[weight > 0 ? 'positive' : 'negative']++;
      evidence[type].set(key, entry);
    }
  }
  return new Map(events.map(event => {
    const a = assessment(fields, event.id);
    const explicit = a.hidden ? 'hidden' : a.planned ? 'planned' : a.saved ? 'saved' : null;
    if (explicit) return [event.id, {group:explicit,score:0,reasons:[],explicit:true}];
    let score = 0, support = 0;
    const reasons = [];
    const history = spotifyMatch(event, listening);
    if (history) {
      score += 3 + Math.min(1, Math.log1p(Math.max(0, Number(history.score) || 0)) / 8);
      reasons.push(`${history.name} is in your listening history`);
      support += 3;
    }
    for (const [type, keys] of Object.entries(features(event))) {
      const matches = keys.map(key => ({key,entry:evidence[type].get(key)})).filter(x=>x.entry);
      if (!matches.length) continue;
      // Average multi-genre/artist matches: large lineups do not gain free points.
      const multiplier = {artist:1.5,genre:0.8,venue:0.2}[type];
      // Broad genres must beat the person's baseline selectivity. Otherwise a
      // user who rejects most shows would appear to dislike every music genre.
      const baseline = type === 'genre' && totalChoices >= 3 ? totalWeight / totalChoices : 0;
      const contribution = matches.reduce((sum,{entry})=>sum + multiplier * (entry.sum - baseline * entry.count) / (entry.count + 2),0) / matches.length;
      score += contribution;
      if (Math.abs(contribution) < 0.12) continue;
      const strongest = matches.sort((a,b)=>Math.abs(b.entry.sum)/(b.entry.count+2)-Math.abs(a.entry.sum)/(a.entry.count+2))[0];
      support += strongest.entry.count;
      const {entry} = strongest;
      if (type === 'artist') reasons.push(entry.sum > 0 ? 'An artist from shows you saved, planned, or rated highly' : 'An artist from shows you passed on or rated low');
      if (type === 'genre') reasons.push(contribution > 0 ? 'Genres overlap with your saved, planned, or highly rated shows' : 'Genres overlap with shows you passed on or rated low');
      if (type === 'venue' && entry.sum > 0) reasons.push('A venue from your saved or planned shows');
    }
    // Avoid confidently rejecting shows on one weak signal or on venue alone.
    const group = score >= 2.5 ? 'top' : score >= 0.55 ? 'likely' : score <= -0.8 && support >= 3 ? 'unlikely' : 'explore';
    return [event.id,{group,score,reasons:reasons.slice(0,2),explicit:false,
      confidence: history || support >= 6 ? 'More signals' : 'Early estimate'}];
  }));
}
export function rankDaily(events, predictions) {
  const order = new Map(recommendationGroups.map(([id],i)=>[id,i]));
  return [...events].sort((a,b)=>(a.date || '9999').localeCompare(b.date || '9999')
    || order.get(predictions.get(a.id)?.group || 'explore')-order.get(predictions.get(b.id)?.group || 'explore')
    || (predictions.get(b.id)?.score || 0)-(predictions.get(a.id)?.score || 0)
    || (a.time || '').localeCompare(b.time || '') || a.id.localeCompare(b.id));
}
