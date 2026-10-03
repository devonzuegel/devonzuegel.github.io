import test from 'node:test';
import assert from 'node:assert/strict';
import {enrichFromDatasets} from '../shared/enrichment.js';
import {mergeEvents} from '../shared/core.js';
import {matchMusicBrainz,matchPlace} from '../server/musicbrainz.mjs';
const event=(id,extra={})=>({id,title:'Example act',date:'2026-10-03',metro:'sf',venue:{id:'one',name:'Example club',locality:'San Francisco'},sources:[{name:id,url:`https://example.com/${id}`}],...extra});
test('missing event time is filled by another dataset with provenance and keeps its identity',()=>{
 const a=event('official'), b=event('tickets',{time:'21:30',timeKind:'show'});
 const [out]=enrichFromDatasets([a,b]);
 assert.equal(out.time,'21:30');assert.equal(out.id,'official');assert.equal(out.provenance.time.sources[0].name,'tickets');assert.equal(a.time,undefined);
});
test('ambiguous show times are flagged rather than guessed; known times are not overwritten',()=>{
 const list=[event('official'),event('early',{time:'18:00'}),event('late',{time:'22:00'})];
 const out=enrichFromDatasets(list);
 assert.equal(out[0].time,undefined);assert.equal(out[0].dataConflicts[0].field,'time');assert.equal(out[1].time,'18:00');
});
test('different date, city, room and similarly named act are not matched',()=>{
 for(const extra of [{date:'2026-10-04'},{metro:'nyc'},{venue:{name:'Example club',locality:'San Francisco',room:'Small room'}},{title:'Example act afterparty'}]) {
  assert.equal(enrichFromDatasets([event('a'),event('b',{time:'20:00',...extra})])[0].time,undefined);
 }
});
test('venue descriptions and capacities transfer across dates with field-level sources',()=>{
 const donor=event('b',{date:'2026-11-01',venue:{id:'one',name:'Example club',locality:'San Francisco',description:'Standing music hall',capacity:{min:300,max:300}}});
 const [out]=enrichFromDatasets([event('a'),donor]);
 assert.equal(out.venue.capacity.max,300);assert.equal(out.provenance['venue.capacity'].secondary,true);
});
test('same event in different metros never collapses',()=>{
 assert.equal(mergeEvents([event('a',{time:'20:00'}),event('b',{time:'20:00',metro:'nyc'})]).length,2);
});
test('MusicBrainz rejects ambiguous artists and places in the wrong city',()=>{
 const a={name:'Phoenix',type:'Group',id:'1'};
 assert.equal(matchMusicBrainz('Phoenix',{artists:[a,{...a,id:'2'}]}),null);
 assert.equal(matchMusicBrainz('Phoenix',{artists:[a]}).id,'1');
 assert.equal(matchPlace({name:'Audio',locality:'San Francisco'},{places:[{name:'Audio',area:{name:'New York'}}]}),null);
});
