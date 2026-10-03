import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVenue} from '../server/parsers.mjs';
import {mergeEvents} from '../shared/core.js';
const source={id:'19hz-bayarea',name:'19hz',parser:'19hz-bayarea',metro:'sf',timezone:'America/Los_Angeles',url:'https://19hz.info/eventlisting_BayArea.php'};
const row='<table><tr><td>Sat: Oct 3 (7pm-11:30pm)</td><td><a href="https://www.eventbrite.com/e/feels-tickets-1997536497436">Feels: DJ A</a> @ The Faight (San Francisco)</td><td>house</td><td>$15</td><td></td><td></td><td>2026/10/03</td></tr></table>';
test('regional discovery imports non-Halcyon venues with exact dates and secondary attribution',()=>{
 const [e]=parseVenue(source,row);assert.equal(e.venue.name,'The Faight');assert.equal(e.venue.locality,'San Francisco');assert.equal(e.time,'19:00');assert.equal(e.date,'2026-10-03');assert.equal(e.id,'eventbrite-1997536497436');assert.equal(e.provenance.time.secondary,true);
 assert.equal(parseVenue({...source,parser:'19hz-halcyon'},row).length,0);
});
test('organizer imports use actual event location and merge by Eventbrite identity',()=>{
 const item={id:'1997536497436',name:'Feels in the club',start_date:'2026-10-03',start_time:'19:00:00',timezone:'America/Los_Angeles',url:'https://www.eventbrite.com/e/feels-tickets-1997536497436',primary_venue:{id:'123',name:'The Faight Collective',address:{city:'San Francisco',region:'CA',latitude:'37.77',longitude:'-122.43'}}};
 const html=events=>`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({props:{pageProps:{upcomingEvents:events}}})}</script>`;
 const organizer={...source,id:'faight',name:'The Faight Collective',parser:'eventbrite-organizer',url:'https://www.eventbrite.com/o/75467307963'};
 const [e]=parseVenue(organizer,html([item,{...item,id:'online',is_online_event:true},{...item,id:'private',is_protected_event:true}]));
 assert.equal(e.venue.lat,37.77);assert.equal(e.sourceId,'faight');
 const merged=mergeEvents([...parseVenue(source,row),e]);assert.equal(merged.length,1);assert.equal(merged[0].title,item.name);assert.ok(merged[0].sources.some(s=>s.name==='19hz'));assert.equal(merged[0].venue.name,'The Faight Collective');
 assert.throws(()=>parseVenue(organizer,html(null)));
});
