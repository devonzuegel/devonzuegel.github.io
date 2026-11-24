import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {plannedEvents, planMarkup} from '../shared/concert-plan.js';
import {concertChoices} from '../shared/share-lists.js';
import {assessment} from '../shared/core.js';
import {projectEventFields} from '../shared/event-associations.js';
const a = {id:'one', aliases:['old'], title:'One <show>', date:'2026-11-28', time:'18:00', venue:{name:'Club'}};
const b = {id:'two', title:'Two', date:'2026-11-27', time:'23:00', venue:{name:'Club'}};
test('plan resolves duplicate aliases, sorts chronologically and escapes markup', () => {
 assert.deepEqual(plannedEvents([a,b], ['old','two','one']).map(e=>e.id), ['two','one']);
 const html = planMarkup([a,b], ['old']);
 assert.match(html,/One &lt;show&gt;/);
 assert.match(html,/data-action="open"/);
 assert.doesNotMatch(html,/>Two</);
 assert.equal(planMarkup([a],[]),'');
});
test('planned status survives alias projection and is separate from saving', () => {
 const fields=projectEventFields({'event/old/planned':{value:true}}, [['one','old']]);
 assert.equal(assessment(fields,'one').planned,true);
 assert.equal(assessment(fields,'one').saved,false);
});
test('editor exposes accessible stars, including collapsed past shows', () => {
 const html=concertChoices([a,b],new Set(['one']),false,new Date('2026-11-28T17:00Z'),new Set(['one']));
 assert.match(html,/data-plan-id="one" aria-pressed="true"/);
 assert.match(html,/<details class="shared-past-shows">/);
});
test('shared plan persists, rejects strangers, preserves old clients, and removes stale IDs', async () => {
 const dir=await mkdtemp(join(tmpdir(),'concert-plans-'));
 process.env.CONCERTS_DATA_DIR=dir;
 delete process.env.KV_REST_API_URL;
 delete process.env.UPSTASH_REDIS_REST_URL;
 const {saveList,readList,addToList}=await import('../server/shared-lists.mjs');
 try {
  const list=await saveList('owner',{title:'Plan',events:[a,b],plannedIds:['one','one','missing']});
  assert.deepEqual((await readList(list.id)).plannedIds,['one']);
  await assert.rejects(saveList('stranger',{id:list.id,title:'Plan',events:[a],plannedIds:[]}),/not found/);
  assert.deepEqual((await saveList('owner',{id:list.id,title:'Plan',events:[a,b]})).plannedIds,['one']);
  assert.deepEqual((await addToList('owner',list.id,{...b,id:'three'})).plannedIds,['one']);
  assert.deepEqual((await saveList('owner',{id:list.id,title:'Plan',events:[b]})).plannedIds,[]);
  await assert.rejects(saveList('owner',{title:'Plan',events:[a],plannedIds:'one'}),/Invalid planned/);
 } finally {await rm(dir,{recursive:true,force:true});}
});

test('day grid preserves duration, gives overlaps separate lanes, and maps untimed shows', () => {
 const date = '2026-11-28', timezone = 'America/Los_Angeles';
 const shows = [
   {...a, date, timezone, time:'22:00', showTime:'22:30', endAt:'2026-11-29T09:00Z', venue:{name:'One',lat:37.76,lng:-122.42}},
   {...b, date, timezone, time:'22:45', timeKind:'doors', venue:{name:'Two',lat:37.77,lng:-122.41}},
   {id:'three',title:'Untimed',date,timezone,venue:{name:'Three',lat:37.78,lng:-122.40}},
 ];
 const markup = planMarkup(shows,shows.map(show=>show.id));
 assert.match(markup,/--start:0\.5;--duration:2\.5;--lane:0;--lanes:2/);
 assert.match(markup,/--start:0\.75;--duration:2.5;--lane:1;--lanes:2/);
 assert.match(markup,/10:30pm–1am next day/);
 assert.match(markup,/10:45pm–1:15am next day · est. · doors/);
 assert.match(markup,/Start time TBA/);
 assert.match(markup,/&quot;timed&quot;:false/);
 assert.doesNotMatch(planMarkup(shows,['one'],{interactive:false}),/data-plan-stops/);
});

test('late electronic nights and festivals get longer estimates than a concert', () => {
 const show = {...a,date:'2026-11-27',time:'22:00'};
 const estimated = event => planMarkup([event],[event.id]);
 assert.match(estimated(show),/10pm–12am next day · est\./);
 assert.match(estimated({...show,genres:['Electronic']}),/10pm–2am next day · est\./);
 assert.match(estimated({...show,eventType:'festival',time:'15:00'}),/3pm–9pm · est\./);
 const confirmed = {...show,timezone:'America/New_York',endAt:'2026-11-28T04:30Z'};
 assert.match(estimated(confirmed),/10pm–11:30pm/);
 assert.doesNotMatch(estimated(confirmed),/ · est\./);
});

test('all plan days share the full local-hour range across midnight', () => {
 const shows = [
   {...a, date:'2026-11-27', time:'22:00'},
   {...b, date:'2026-11-28', time:'18:00'},
   {id:'late', title:'Late show', date:'2026-11-29', time:'23:30', genres:['Electronic']},
 ];
 const markup = planMarkup(shows, shows.map(show => show.id));
 assert.equal((markup.match(/--day-hours:10/g) || []).length, 3);
 assert.equal((markup.match(/--hour:0"><span>6pm/g) || []).length, 3);
 assert.equal((markup.match(/--hour:10"><span>4am/g) || []).length, 3);
 assert.match(markup, /data-id="one"[^>]*--start:4;/);
 assert.match(markup, /data-id="late"[^>]*--start:5\.5;/);
});
