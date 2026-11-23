import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendConcerts,rankDaily} from '../shared/recommendations.js';
const event=(id,artist='Artist',genre='Rock')=>({id,title:id,date:'2026-11-28',time:'20:00',artists:[{name:artist}],genres:[genre],venue:{id:'venue'}});
const field=(id,key,value)=>({[`event/${id}/${key}`]:{value}});
test('cold start does not invent preferences or mutate decisions',()=>{
 const fields={}; const results=recommendConcerts([event('a')],fields);
 assert.equal(results.get('a').group,'explore'); assert.deepEqual(fields,{});
});
test('explicit rejection, plan and save override Spotify suggestions',()=>{
 const es=['a','b','c'].map(id=>event(id));
 const fields={...field('a','hidden',true),...field('b','planned',true),...field('c','saved',true)};
 const r=recommendConcerts(es,fields,{artist:{score:100}});
 assert.deepEqual(es.map(e=>r.get(e.id).group),['hidden','planned','saved']);
});
test('listening matches rank first within a date and accounts remain isolated',()=>{
 const es=[event('a','Unknown'),event('b','Favorite')];
 const r=recommendConcerts(es,{}, {favorite:{score:100}});
 assert.equal(r.get('b').group,'top'); assert.equal(rankDaily(es,r)[0].id,'b');
 assert.equal(recommendConcerts(es,{}).get('b').group,'explore');
});
test('repeated choices teach positive and negative preferences',()=>{
 const es=[...Array.from({length:5},(_,i)=>event('saved'+i,'Liked','Jazz')),...Array.from({length:5},(_,i)=>event('hidden'+i,'Disliked','Metal')),event('new-positive','Liked','Jazz'),event('new-negative','Disliked','Metal')];
 const fields=Object.assign({},...es.filter(e=>e.id.startsWith('saved')).map(e=>field(e.id,'planned',true)),...es.filter(e=>e.id.startsWith('hidden')).map(e=>field(e.id,'hidden',true)));
 const r=recommendConcerts(es,fields);
 assert.equal(r.get('new-positive').group,'top'); assert.equal(r.get('new-negative').group,'unlikely');
});
test('one rejection or venue-only signals do not confidently reject unrelated artists',()=>{
 const es=[event('old','One','Rock'),event('new','Two','Jazz')];
 assert.equal(recommendConcerts(es,field('old','hidden',true)).get('new').group,'explore');
});
test('duplicate aliases do not multiply training weight and dates stay chronological',()=>{
 const old={...event('old'),aliases:['alias']};const copy=event('alias');const fresh=event('fresh');
 const fields={...field('old','saved',true),...field('alias','saved',true)};
 assert.equal(recommendConcerts([old,copy,fresh],fields).get('fresh').score,recommendConcerts([old,fresh],fields).get('fresh').score);
 const earlier={...event('earlier','Nobody'),date:'2026-11-27'};
 const r=recommendConcerts([earlier,fresh],{}, {artist:{score:100}});
 assert.equal(rankDaily([fresh,earlier],r)[0].id,'earlier');
});
test('selective users do not automatically dislike every show in a broad genre',()=>{
 const es=Array.from({length:20},(_,i)=>event('old'+i,'Artist'+i,'Electronic'));
 const fields=Object.assign({},...es.map((e,i)=>field(e.id,i<17?'hidden':'saved',true)));
 const candidate={...event('new','New artist','Electronic'),venue:{id:'new-venue'}};
 assert.equal(recommendConcerts([...es,candidate],fields).get('new').group,'explore');
});
