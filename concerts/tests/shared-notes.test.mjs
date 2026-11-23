import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sharedNotesFor} from '../shared/shared-notes.js';
import {planMarkup} from '../shared/concert-plan.js';
const dir=await mkdtemp(join(tmpdir(),'shared-notes-'));
process.env.CONCERTS_DATA_DIR=dir;delete process.env.KV_REST_API_URL;delete process.env.UPSTASH_REDIS_REST_URL;
const {validateOp}=await import('../server/profiles.mjs');
const event={id:'show',title:'Show',date:'2026-11-28',time:'18:00',venue:{name:'Venue'}};
test('only explicitly shared notes enter public output, escaped in calendar',()=>{
 const fields={'event/show/notes':{value:'private secret'},'event/show/publicNote':{value:'Meet <here>\nat six'}};
 assert.deepEqual(sharedNotesFor([event],fields),{show:'Meet <here>\nat six'});
 const html=planMarkup([event],['show'],{notes:sharedNotesFor([event],fields)});
 assert.match(html,/Meet &lt;here&gt;/);assert.doesNotMatch(html,/private secret/);
 assert.throws(()=>validateOp({id:'op',key:'event/show/publicNote',value:'x'.repeat(3001),baseRev:0}),/3,000/);
});
test('one public note updates every existing list and clearing removes it',async()=>{
 const storage=await import('../server/storage.mjs');const {saveList,readList}=await import('../server/shared-lists.mjs');
 try {
  const a=await saveList('owner',{title:'A',events:[event]});const b=await saveList('owner',{title:'B',events:[event]});
  await storage.set('profile:owner',{fields:{'event/show/notes':{value:'private'},'event/show/publicNote':{value:'See you at 6'}}});
  assert.equal((await readList(a.id)).sharedNotes.show,'See you at 6');assert.equal((await readList(b.id)).sharedNotes.show,'See you at 6');
  await storage.set('profile:owner',{fields:{'event/show/publicNote':{value:''}}});
  assert.deepEqual((await readList(a.id)).sharedNotes,{});
 } finally {await rm(dir,{recursive:true,force:true});}
});
