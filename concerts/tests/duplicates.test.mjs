import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeEvents, allEvents } from '../shared/core.js';
import { mergeCatalogEvents } from '../server/catalog-merge.mjs';
import { projectEventFields } from '../shared/event-associations.js';
const original = JSON.parse(readFileSync(new URL('./fixtures/josh-fawaz-duplicates.json', import.meta.url)));
const official = original.find(e => e.id === 'zeyzey-ho4fnc');
const community = original.find(e => e.id === 'zeyzey-1ygnzyz') || official.sourceRecords.find(e => e.id === 'zeyzey-1ygnzyz');
test('Josh Fawaz merges in either order, retaining photo, clean artist, metadata and complete sources', () => {
 for (const input of [[official, community], [community, official]]) {
  const before = structuredClone(input);
  for (const merge of [mergeEvents, mergeCatalogEvents]) {
   const output = merge(input); assert.equal(output.length, 1);
   const e = output[0]; assert.equal(e.id, official.id); assert.ok(e.aliases.includes(community.id));
   assert.equal(e.image, official.image); assert.equal(e.title, official.title);
   assert.equal(e.artists[0].name, 'Josh Fawaz'); assert.ok(e.genres.includes('Electronic'));
   assert.ok(e.sources.some(s => s.url === community.ticketUrl));
   assert.ok(e.sourceRecords.some(s => s.id === community.id));
   assert.deepEqual(merge([e]), [e]);
  }
  assert.deepEqual(input, before);
 }
});
test('different dates, times, rooms, qualifiers and performers remain separate', () => {
 for (const change of [{date:'2026-11-29'}, {time:'22:00'}, {time:null}, {title:'Josh Fawaz (Acoustic)'}, {title:'Someone Else'}, {venue:{...community.venue,room:'Second room'}}]) {
  assert.equal(mergeEvents([official,{...community,...change}]).length, 2);
 }
 const base = {...community,title:'Josh Fawaz (Early Show)'};
 assert.equal(mergeEvents([base,{...base,id:'late',title:'Josh Fawaz (Late Show)'}]).length,2);
});
test('saved snapshots cannot resurrect duplicates, including old deep-link IDs', () => {
 const [e]=mergeEvents([official,community]);
 const result=allEvents([e],{[`event/${community.id}/snapshot`]:{value:community}});
 assert.equal(result.length,1);assert.equal(result[0].missingFromFeed,false);assert.ok(result[0].aliases.includes(community.id));
});
test('both notebook entries retain notes, saves and ratings without mutating storage', () => {
 const fields={
  [`event/${official.id}/saved`]:{value:false,rev:2},
  [`event/${community.id}/saved`]:{value:true,rev:3},
  [`event/${official.id}/notes`]:{value:'Meet Pat',rev:1},
  [`event/${community.id}/notes`]:{value:'Tickets booked',rev:2},
  [`event/${community.id}/music`]:{value:4,rev:1},
 };
 const copy=structuredClone(fields),projected=projectEventFields(fields,[[official.id,community.id]]);
 assert.equal(projected[`event/${official.id}/saved`].value,true);
 assert.equal(projected[`event/${official.id}/notes`].value,'Meet Pat\n\nTickets booked');
 assert.equal(projected[`event/${official.id}/music`].value,4);
 assert.deepEqual(fields,copy);
});
test('ambiguous early/late labels do not absorb an unspecified listing', () => {
 const plain={...community,sourceId:'other',title:'Josh Fawaz'};
 const early={...plain,id:'early',title:'Josh Fawaz (Early Show)'};
 const late={...plain,id:'late',title:'Josh Fawaz (Late Show)'};
 for(const records of [[plain,early,late],[late,plain,early],[early,late,plain]]) assert.equal(mergeEvents(records).length,3);
});
