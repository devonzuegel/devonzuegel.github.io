import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVenue} from '../server/parsers.mjs';
const base = {id:'club',name:'Audio',metro:'sf',timezone:'America/Los_Angeles',url:'https://example.com/',lat:37,lng:-122};
const now = new Date('2026-10-02T12:00:00Z');
test('Audio preserves off-site location without assigning club coordinates',()=>{
 const [event]=parseVenue({...base,parser:'audio'},'<div id="cal-event-block-in"><div id="cal-list-box-left"><a href="/show">Oct 03</a></div><div id="cal-list-box-center">DJ (Day Party @ 620 Jones Terrace)</div><form action="https://tickets.example.com/show"></form></div>',now);
 assert.equal(event.date,'2026-10-03');assert.equal(event.venue.name,'620 Jones Terrace');assert.equal(event.venue.lat,null);
});
test('F8 overnight listings use the starting date and time',()=>{
 const [event]=parseVenue({...base,parser:'squarespace-events'},'<article class="eventlist-event"><h1 class="eventlist-title"><a class="eventlist-title-link" href="/night">DJ Night</a></h1><time class="event-date" datetime="2026-10-02"></time><time class="event-time-24hr">22:00</time><time class="event-date" datetime="2026-10-03"></time><time class="event-time-24hr">03:00</time></article>',now);
 assert.equal(event.date,'2026-10-02');assert.equal(event.startAt,'2026-10-03T05:00:00.000Z');assert.ok(!event.endDate);
});
test('Halcyon ignores undated legacy links and Public Works retains ticket links',()=>{
 const events=parseVenue({...base,parser:'halcyon-links'},'<a href="https://dice.fm/event/a" aria-label="DJ Tickets | 17 Oct | DICE"></a><a href="https://dice.fm/event/old">01/01 OLD DJ</a>',now);
 assert.equal(events.length,1);assert.equal(events[0].date,'2026-10-17');
 const [event]=parseVenue({...base,parser:'publicworks'},'<div class="eventbrite-items"><div class="event-item"><a href="https://tickets.example.com/dj"><div class="event-title">DJ</div><div class="event-date">Oct 02</div></a></div></div>',now);
 assert.equal(event.ticketUrl,'https://tickets.example.com/dj');
});
test('19hz imports only Halcyon SF with explicit year, lineup, genres and start time',()=>{
 const row=(venue,date)=>`<tr><td>Sat: Oct 3<br>(10pm-4am)</td><td><a href="https://dice.fm/event/abc">Anyasa, Arjuna</a> @ ${venue}</td><td>progressive house</td><td></td><td></td><td></td><td>${date}</td></tr>`;
 const events=parseVenue({...base,id:'halcyon',name:'Halcyon',parser:'19hz-halcyon',url:'https://19hz.info/eventlisting_BayArea.php'},'<table>'+row('Halcyon (San Francisco)','2026/10/03')+row('Audio (San Francisco)','2026/10/03')+row('Halcyon (San Francisco)','')+'</table>',now);
 assert.equal(events.length,1);assert.equal(events[0].date,'2026-10-03');assert.equal(events[0].startAt,'2026-10-04T05:00:00.000Z');assert.deepEqual(events[0].artists.map(a=>a.name),['Anyasa','Arjuna']);assert.equal(events[0].sources[0].name,'19hz · Halcyon');assert.ok(!events[0].endDate);
});
