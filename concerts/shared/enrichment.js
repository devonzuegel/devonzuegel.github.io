// Conservative joins: never use an artist name alone to identify an event.
const norm = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const present = value => value != null && value !== "" && (!Array.isArray(value) || value.length > 0);
export function sameVenue(a,b) {
  const av=a.venue||{}, bv=b.venue||{};
  if (!a.metro || a.metro!==b.metro || !norm(av.name) || norm(av.name)!==norm(bv.name) || norm(av.room)!==norm(bv.room)) return false;
  if(norm(av.locality) && norm(bv.locality) && norm(av.locality)!==norm(bv.locality)) return false;
  if (av.id && av.id===bv.id) return true;
  if (norm(av.locality) && norm(av.locality)===norm(bv.locality)) return true;
  return [av.lat,av.lng,bv.lat,bv.lng].every(Number.isFinite) && Math.hypot(av.lat-bv.lat,av.lng-bv.lng)<0.002;
}
function evidence(event, field, match) {
  return event.provenance?.[field] || (field.startsWith("venue.") ? event.venue?.provenance?.[field.slice(6)] : null) || {secondary:true, sources:event.sources||[], match, checkedAt:event.fetchedAt||null};
}
const signature = value => JSON.stringify(value);
export function enrichFromDatasets(events) {
  const byVenue=new Map();
  for (const e of events) {
    const key=`${e.metro}|${norm(e.venue?.name)}|${norm(e.venue?.room)}`;
    if (!byVenue.has(key)) byVenue.set(key,[]);
    byVenue.get(key).push(e);
  }
  return events.map(original=>{
    if (!original?.venue) return original;
    const e={...original,venue:{...original.venue,provenance:{...original.venue.provenance}},provenance:{...original.provenance},dataConflicts:[...(original.dataConflicts||[])]};
    const neighbors=(byVenue.get(`${e.metro}|${norm(e.venue.name)}|${norm(e.venue.room)}`)||[]).filter(other=>other.id!==e.id && sameVenue(e,other));
    const matches=neighbors.filter(other=>other.date===e.date && norm(other.title)===norm(e.title) && (other.endDate||other.date)===(e.endDate||e.date));
    function fill(field, candidates, read, assign, key=signature) {
      const found=candidates.filter(c=>present(read(c)));
      if (!found.length) return;
      const distinct=new Set(found.map(c=>key(read(c))));
      const current=read(e);
      if (distinct.size>1 || (present(current) && !distinct.has(key(current)))) {
        if (!e.dataConflicts.some(c=>c.field===field)) e.dataConflicts.push({field,sources:found.flatMap(c=>c.sources||[])});
        return;
      }
      if (present(current)) return;
      const donor=found[0];
      assign(read(donor),donor);
      e.provenance[field]=evidence(donor,field,field.startsWith('venue.')?'Same venue, city and room':'Same title, date, venue, city and room');
      if(field.startsWith('venue.')) e.venue.provenance[field.slice(6)]=e.provenance[field];
    }
    // Treat a doors time as a different fact from the start of the show.
    fill('time',matches,c=>c.time ? {time:c.time,kind:c.timeKind||'show'} : null,(value,donor)=>{
      e.time=value.time;e.timeKind=value.kind;e.startAt=donor.startAt||null;
      e.doorsTime=donor.doorsTime||null;e.showTime=donor.showTime||(value.kind==='show'?value.time:null);
    });
    for(const field of ['image','genres','description']) fill(field,matches,c=>c[field],value=>{e[field]=value});
    for(const field of ['capacity','description','address','layout']) fill(`venue.${field}`,neighbors,c=>c.venue?.[field],value=>{e.venue[field]=value},field==='capacity'?v=>`${v.min}|${v.max}|${v.configuration||''}`:signature);
    fill('venue.coordinates',neighbors,c=>Number.isFinite(c.venue?.lat)&&Number.isFinite(c.venue?.lng)?[c.venue.lat,c.venue.lng]:null,value=>{[e.venue.lat,e.venue.lng]=value});
    return e;
  });
}
