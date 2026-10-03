import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const directory=await mkdtemp(join(tmpdir(),'concert-preview-test-'));
process.env.CONCERTS_DATA_DIR=directory;delete process.env.KV_REST_API_URL;delete process.env.UPSTASH_REDIS_REST_URL;
const {default:handler}=await import('../api/share.mjs');
const {saveList,revokeList}=await import('../server/shared-lists.mjs');
const get=async url=>{const result={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(body){this.body=body}};await handler({method:'GET',url},result);return result};
test('share endpoint serves metadata and PNG; revoked and invalid links expose neither',async()=>{
 try {
  const list=await saveList('test-owner',{title:'Friday plans',events:[{id:'show',title:'Artist',date:'2026-10-03',venue:{name:'Club'}}]});
  const url='/api/share?list='+list.id;
  const page=await get(url);assert.equal(page.statusCode,200);assert.match(page.body,/Shared by test-owner/);assert.match(page.body,/og:title/);
  const image=await get(url+'&image=1');assert.equal(image.headers['Content-Type'],'image/png');assert.equal(image.body.subarray(1,4).toString(),'PNG');
  await revokeList('test-owner',list.id);
  for(const target of [url,url+'&image=1','/api/share?list=bad']){const out=await get(target);assert.equal(out.statusCode,404);assert.ok(!out.body.includes('Friday plans'));assert.equal(out.headers['Cache-Control'],'no-store');}
 } finally {await rm(directory,{recursive:true,force:true});}
});
