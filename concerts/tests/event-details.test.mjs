import test from "node:test";
import assert from "node:assert/strict";
import {detailPage,enrichDetails} from "../server/event-details.mjs";
const event = {id:"audio-hamdi",title:"HAMDI",date:"2026-10-03",timezone:"America/Los_Angeles",time:null,ticketUrl:"https://www.audiosf.com/event/hamdi-10-03/",sources:[]};
const structured = (name,startDate) => `<script type="application/ld+json">${JSON.stringify({"@type":"MusicEvent",name,startDate})}</script>`;
test("follows official ticket forms and converts an offset time to venue time",async()=>{
  const urls=[];
  const result=await enrichDetails(event,async url=>{
    urls.push(url);
    return urls.length===1 ? '<form action="https://www.tixr.com/groups/test/events/hamdi-123"><button>TICKETS</button></form>' : structured("HAMDI at Audio SF","2026-10-04T04:30:00Z");
  });
  assert.equal(urls.length,2);
  assert.equal(result.time,"21:30");
  assert.equal(result.startAt,"2026-10-04T04:30:00.000Z");
  assert.equal(result.sources[0].url,urls[1]);
});
test("rejects other dates and related artists, and does not mistake date-only for midnight",()=>{
  for(const html of [structured("HAMDI","2026-10-02T21:30:00-07:00"),structured("Other artist","2026-10-03T21:30:00-07:00"),structured("HAMDI","2026-10-03")]) assert.equal(detailPage(event,html,event.ticketUrl).patch.time,undefined);
});
test("blocked ticket provider preserves listing and existing times need no requests",async()=>{
  assert.deepEqual(await enrichDetails(event,async()=>{throw Error("403")}),event);
  assert.equal((await enrichDetails({...event,time:"20:00"},async()=>{assert.fail()})).time,"20:00");
});
test("door time is distinct from show time and unrelated links are not followed",()=>{
  const {patch,links}=detailPage(event,'<article><h1>HAMDI</h1>Doors open 9:30 pm</article><a href="https://example.org">Buy tickets</a>',event.ticketUrl);
  assert.equal(patch.timeKind,"doors");assert.equal(patch.time,"21:30");assert.deepEqual(links,[]);
});
