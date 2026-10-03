import * as cheerio from 'cheerio';
import {makeEvent,clean} from './parsers.mjs';
import {hash,dayInZone} from '../shared/core.js';

export function partifulURL(value) {
  let url;try {url=new URL(value);} catch {throw new Error('Enter a Partiful event URL.');}
  if(url.protocol!=='https:' || !['partiful.com','www.partiful.com'].includes(url.hostname) || url.port || url.username || url.password || !/^\/e\/[A-Za-z0-9]{10,40}\/?$/.test(url.pathname)) throw new Error('Enter a public partiful.com/e/… event URL.');
  return 'https://partiful.com'+url.pathname.replace(/\/$/,'');
}
export function parsePartiful(html,source,{single=false}={}) {
  const $=cheerio.load(html),items=[];
  let data;try {data=JSON.parse($('#__NEXT_DATA__').text()).props.pageProps;}catch{}
  if(single && (!data?.event?.isPublic || data.passwordRequired || data.event.visibility!=='public')) throw new Error('Only public Partiful events can be imported.');
  function walk(x){if(!x||typeof x!=='object')return;if(x['@type']==='Event')items.push(x);else for(const v of Object.values(x))if(Array.isArray(v))v.forEach(walk);else if(typeof v==='object')walk(v);}
  $('script[type="application/ld+json"]').each((i,n)=>{try{walk(JSON.parse($(n).text()));}catch{}});
  const result=[];
  for(const item of items) {
    let url;try{url=partifulURL(item.url);}catch{continue;}
    if(single && url!==partifulURL(source.url))continue;
    if(/OnlineEventAttendanceMode$/.test(item.eventAttendanceMode||''))continue;
    const text=clean(item.name+' '+(item.description||''));
    if(!single && !/\b(concert|live music|live bands?|dj sets?|dance party|dance music|rave|techno|house music|afrobeats|amapiano|music by|performances by|open mic)\b/i.test(text))continue;
    const timezone=single?data.event.timezone:source.timezone;
    const start=new Date(item.startDate);if(!Number.isFinite(+start)||!timezone)continue;
    const date=dayInZone(start,timezone);
    const time=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(start);
    const location=item.location||{};
    const address=typeof location.address==='string'?location.address:[location.address?.streetAddress,location.address?.addressLocality,location.address?.addressRegion,location.address?.postalCode].filter(Boolean).join(', ');
    const locality=location.address?.addressLocality || address.match(/,\s*([^,]+),\s*[A-Z]{2}\b/)?.[1] || '';
    const metro=source.metro || (/\b(San Francisco|Oakland|Berkeley|Alameda|Emeryville|San Jose|Daly City|San Mateo|Palo Alto|Richmond|Sausalito|Marin)\b/i.test(address)?'sf':/\b(NY|NJ)\b/.test(address)?'nyc':/\bFL\b/.test(address)?'miami':'custom');
    const venue={id:'partiful-venue-'+hash(address||location.name||url),name:clean(location.name)||'Location not published',address,locality,metro,timezone};
    const event=makeEvent(venue,{id:'partiful-'+url.split('/').at(-1),title:item.name,date,time,startAt:start.toISOString(),endAt:item.endDate||null,url,image:[item.image].flat()[0],status:/EventCancelled$/.test(item.eventStatus||'')?'cancelled':'scheduled',genres:[]});
    if(!event)continue;
    event.sourceId=source.id||'partiful-import';event.sources=[{name:'Partiful',url}];
    if(!single)event.sources.push({name:'Partiful Explore',url:source.url});
    // Deliberately retain event details only, never hosts, guests, or activity.
    event.description=clean(item.description).slice(0,6000);
    result.push(event);
  }
  if(single&&!result.length)throw new Error('This page does not publish a readable event date and title.');
  return [...new Map(result.map(e=>[e.id,e])).values()];
}
export async function importPartiful(value) {
  const url=partifulURL(value);
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Partiful could not be reached. Try again later.');
  const html=await response.text();
  if(html.length>2500000)throw new Error('Event page is too large.');
  return parsePartiful(html,{url},{single:true})[0];
}
