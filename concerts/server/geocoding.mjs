import {json} from './network.mjs';
import * as store from './storage.mjs';
import {hash} from '../shared/core.js';
const normalized=value=>String(value||'').toUpperCase().replace(/\bSTREET\b/g,'ST').replace(/\bAVENUE\b/g,'AVE').replace(/\bROAD\b/g,'RD').replace(/\bBOULEVARD\b/g,'BLVD').replace(/[^A-Z0-9]/g,'');
export function matchAddress(venue,matches) {
  if(!venue.locality || !/^\d+\s/.test(venue.address||'')) return null;
  const street=normalized(venue.address.split(',')[0]);
  const valid=matches.filter(m=>normalized(m.addressComponents?.city)===normalized(venue.locality) && normalized(m.matchedAddress?.split(',')[0])===street && Number.isFinite(m.coordinates?.x) && Number.isFinite(m.coordinates?.y) && Math.abs(m.coordinates.y)<=90 && Math.abs(m.coordinates.x)<=180);
  return valid.length===1 ? valid[0] : null;
}
export async function geocodeVenue(venue,metro) {
  if(Number.isFinite(venue.lat)&&Number.isFinite(venue.lng)) return venue;
  const state=venue.address?.match(/,\s*([A-Z]{2})(?:\s+\d{5})?\s*$/)?.[1] || {sf:'CA',nyc:'NY',miami:'FL'}[metro];
  if(!state || !venue.locality || !/^\d+\s/.test(venue.address||'')) return venue;
  const address=[venue.address.split(',')[0],venue.locality,state].join(', ');
  const key='venue-geocode:v1:'+hash(address);
  const cached=await store.get(key).catch(()=>null);
  let match;
  const url=new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
  url.search=new URLSearchParams({address,benchmark:'Public_AR_Current',format:'json'});
  if(cached && Date.now()-cached.at<(cached.match?90:1)*86400000) match=cached.match;
  else {
    const response=await json(url,{signal:AbortSignal.timeout(6000)});
    match=matchAddress(venue,response.result?.addressMatches||[]);
    await store.set(key,{at:Date.now(),match}).catch(()=>{});
  }
  if(!match) return venue;
  return {...venue,lat:match.coordinates.y,lng:match.coordinates.x,locationApproximate:true,locationSource:url.href,provenance:{...venue.provenance,coordinates:{secondary:true,sources:[{name:'US Census address geocoder',url:url.href}],match:'Exact street address and city; approximate street-address pin, not verified entrance'}}};
}
