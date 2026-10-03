import test from 'node:test';import assert from 'node:assert/strict';
import {parsePartiful,partifulURL} from '../server/partiful.mjs';
import {mergeEvents,allEvents} from '../shared/core.js';
const url='https://partiful.com/e/IJe2t9KZaqAXXdCL5bZa';
const item={'@type':'Event',url,name:'Underground',description:'Techno and DJ sets',startDate:'2026-10-04T05:00:00Z',endDate:'2026-10-04T09:00:00Z',location:{name:"Mr. Mahjong’s",address:'260 Kearny St, San Francisco, CA 94108'}};
const html=(items,event={isPublic:true,visibility:'public',timezone:'America/Los_Angeles'})=>`<script type="application/ld+json">${JSON.stringify({'@type':'ItemList',itemListElement:items})}</script><script id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:{event,hosts:[{name:'Do not import'}]}}})}</script>`;
test('Partiful imports local dates across UTC midnight without importing hosts or guests',()=>{
 const [e]=parsePartiful(html([item]),{url},{single:true});assert.equal(e.date,'2026-10-03');assert.equal(e.time,'22:00');assert.equal(e.endAt,item.endDate);assert.equal(e.venue.locality,'San Francisco');assert.ok(!JSON.stringify(e).includes('Do not import'));
 assert.equal(allEvents([],{['event/'+e.id+'/snapshot']:{value:e}})[0].id,e.id);
});
test('Explore excludes nonmusic and online events; unknown exact locations remain unknown',()=>{
 const events=parsePartiful(html([item,{...item,url:url+'a',name:'Book club',description:'Reading'},{...item,url:url+'b',eventAttendanceMode:'https://schema.org/OnlineEventAttendanceMode'}]),{id:'partiful-sf',url:'https://partiful.com/explore/sf',metro:'sf',timezone:'America/Los_Angeles'});
 assert.equal(events.length,1);assert.equal(events[0].venue.lat,undefined);
});
test('URL imports reject private events and foreign or malformed URLs',()=>{
 assert.throws(()=>parsePartiful(html([item],{isPublic:false,visibility:'private'}),{url},{single:true}));
 for(const u of ['http://partiful.com/e/IJe2t9KZaqAXXdCL5bZa','https://partiful.com.evil.com/e/IJe2t9KZaqAXXdCL5bZa','https://user:pw@partiful.com/e/IJe2t9KZaqAXXdCL5bZa','https://127.0.0.1/e/abcd','https://partiful.com/explore'])assert.throws(()=>partifulURL(u));
 assert.equal(partifulURL(url+'?tracking=1'),url);
});
test('same Partiful link merges across calendars without losing existing saved ID',()=>{
 const [e]=parsePartiful(html([item]),{url},{single:true});const old={...e,id:'old-19hz-id',title:'Other calendar title',ticketUrl:url+'?',sources:[{name:'19hz',url:'https://19hz.info/'}]};
 const merged=mergeEvents([old,e]);assert.equal(merged.length,1);assert.equal(merged[0].id,old.id);assert.ok(merged[0].sources.some(s=>s.name==='19hz'));
});
