import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../../_concerts-storage-worker/index.mjs';
import {encodeRecord,decodeRecord,cloudflareUpdate} from '../server/cloudflare-storage.mjs';
function database(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE records(key TEXT PRIMARY KEY,value TEXT,version INTEGER NOT NULL)');return {prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)||null;},async run(){return {meta:db.prepare(sql).run(...args)};}};}};}};}
const request=(body,secret='test-secret')=>new Request('https://storage.test',{method:'POST',headers:{Authorization:`Bearer ${secret}`},body:JSON.stringify(body)});
test('D1 storage denies unauthenticated reads and atomically rejects stale writes',async()=>{
 const env={DB:database(),STORAGE_SECRET:'test-secret'},key='concerts:v1:profile:test';
 assert.equal((await worker.fetch(request({action:'get',key},'wrong'),env)).status,401);
 const call=async b=>(await worker.fetch(request({...b,key}),env)).json();
 assert.deepEqual(await call({action:'get'}),{raw:null,version:0});
 const results=await Promise.all(['a','b'].map(raw=>call({action:'cas',raw,version:0})));
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal((await call({action:'cas',raw:'stale',version:0})).ok,false);
 assert.equal((await call({action:'cas',raw:'latest',version:1})).ok,true);
 assert.deepEqual(await call({action:'get'}),{raw:'latest',version:2});
});
test('large and Unicode records round-trip losslessly through compressed storage',()=>{
 const data={notes:'Meet at 6 🎵',large:'event description '.repeat(400000)};
 const encoded=encodeRecord(data);assert.ok(encoded.length<1900000);assert.deepEqual(decodeRecord(encoded),data);assert.equal(decodeRecord(null),null);
});
test('concurrent updates re-read and preserve both writers',async()=>{
 const original=globalThis.fetch;let row={raw:encodeRecord({count:0}),version:1};let first=true;
 process.env.CONCERTS_STORAGE_URL='https://storage.test';process.env.CONCERTS_STORAGE_SECRET='test-secret';
 globalThis.fetch=async(_,options)=>{const b=JSON.parse(options.body);if(b.action==='get')return Response.json(row);if(first){first=false;row={raw:encodeRecord({count:5}),version:2};return Response.json({ok:false});}assert.equal(b.version,2);row={raw:b.raw,version:3};return Response.json({ok:true});};
 try {assert.deepEqual(await cloudflareUpdate('concerts:v1:test',old=>({count:old.count+1})),{count:6});} finally {globalThis.fetch=original;delete process.env.CONCERTS_STORAGE_URL;delete process.env.CONCERTS_STORAGE_SECRET;}
});
