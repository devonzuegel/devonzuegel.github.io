import {json} from './network.mjs';
import {normalize,hash} from '../shared/core.js';
import * as store from './storage.mjs';
export function matchMusicBrainz(name, result) {
  // Refuse an incomplete search result or any ambiguous exact name, regardless of score.
  if ((result.count||0)>100) return null;
  const exact=(result.artists||[]).filter(a=>normalize(a.name)===normalize(name));
  return exact.length===1 && ['Person','Group','Orchestra','Choir'].includes(exact[0].type) ? exact[0] : null;
}
let queue=Promise.resolve();
async function request(url) {
  const job=queue.then(()=>json(url,{signal:AbortSignal.timeout(7000)}));
  queue=job.catch(()=>{}).then(()=>new Promise(resolve=>setTimeout(resolve,1100)));
  return job;
}
export async function musicBrainzContext(name, id) {
  const key='musicbrainz:v1:'+hash(id||normalize(name));
  const cached=await store.get(key).catch(()=>null);
  if(cached && Date.now()-cached.at<7*86400000) return cached.data;
  let artist;
  if(id && /^[a-f0-9-]{36}$/i.test(id)) artist=await request(`https://musicbrainz.org/ws/2/artist/${id}?fmt=json&inc=genres`);
  else {
    const url=new URL('https://musicbrainz.org/ws/2/artist/');
    url.search=new URLSearchParams({fmt:'json',limit:'100',query:`artist:"${name.replace(/["\\]/g,' ')}"`});
    artist=matchMusicBrainz(name,await request(url));
  }
  let data=null;
  if(artist) {
    const facts=[];
    if(artist['begin-area']?.name) facts.push(`${artist.type==='Person'?'Born in':'From'} ${artist['begin-area'].name}`);
    else if(artist.area?.name) facts.push(`Based in ${artist.area.name}`);
    const begin=artist['life-span']?.begin;
    if(/^\d{4}/.test(begin||'')) facts.push(`${artist.type==='Person'?'Born':'Formed'} ${begin.slice(0,4)}`);
    data={name,found:true,description:artist.disambiguation||'',bio:'',facts,genres:(artist.genres||[]).map(g=>g.name).slice(0,4),source:`https://musicbrainz.org/artist/${artist.id}`,sourceName:'MusicBrainz',match:id?'Linked MusicBrainz artist ID from Wikidata':'Unique exact artist name; identity not independently confirmed',secondary:true};
  }
  await store.set(key,{at:Date.now(),data}).catch(()=>{});
  return data;
}
export function matchPlace(venue,result) {
  if((result.count||0)>100 || !venue.locality) return null;
  const matches=(result.places||[]).filter(p=>normalize(p.name)===normalize(venue.name) && normalize(p.area?.name)===normalize(venue.locality));
  return matches.length===1 ? matches[0] : null;
}
export async function venueReference(venue) {
  if(venue.room || !venue.locality) return null;
  const key='musicbrainz-place:v1:'+hash(venue.name+'|'+venue.locality);
  const cached=await store.get(key).catch(()=>null);
  if(cached && Date.now()-cached.at<30*86400000) return cached.data;
  const url=new URL('https://musicbrainz.org/ws/2/place/');
  url.search=new URLSearchParams({fmt:'json',limit:'100',query:`place:"${venue.name.replace(/["\\]/g,' ')}" AND area:"${venue.locality.replace(/["\\]/g,' ')}"`});
  const place=matchPlace(venue,await request(url));
  const data=place ? {address:place.address||'',lat:place.coordinates?Number(place.coordinates.latitude):null,lng:place.coordinates?Number(place.coordinates.longitude):null,description:[place.type,place.disambiguation].filter(Boolean).join(' · '),source:`https://musicbrainz.org/place/${place.id}`} : null;
  await store.set(key,{at:Date.now(),data}).catch(()=>{});
  return data;
}
export async function enrichVenueReferences(events) {
  const deadline=Date.now()+60000;
  const lookedUp=new Map();
  const output=[];
  for(const event of events) {
    const v=event.venue;
    if(Date.now()>deadline){output.push(event);continue;}
    if(!v || (v.description && v.address && Number.isFinite(v.lat) && Number.isFinite(v.lng))) {output.push(event);continue;}
    const key=JSON.stringify([event.metro,v.name,v.locality,v.room]);
    if(!lookedUp.has(key)) lookedUp.set(key,await venueReference(v).catch(()=>null));
    const extra=lookedUp.get(key);
    if(!extra){output.push(event);continue;}
    const venue={...v,provenance:{...v.provenance}};
    for(const field of ['description','address','lat','lng']) if((venue[field]==null || venue[field]==='') && extra[field]!=null && extra[field]!=='') {
      venue[field]=extra[field];
      venue.provenance[field]={secondary:true,sources:[{name:'MusicBrainz',url:extra.source}],match:'Unique exact venue name and city; room matches excluded'};
    }
    output.push({...event,venue});
  }
  return output;
}
