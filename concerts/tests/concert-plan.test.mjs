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
