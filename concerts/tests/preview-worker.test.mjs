import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../_concerts-worker/index.mjs';
const id='abcdefghijklmnopqrstuvwxyzABCDEF';

test('preview worker leaves normal pages/assets unchanged and rejects invalid lists',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async input=>{calls.push(input);return new Response('origin');};
  try {
    for(const path of ['/concerts/','/concerts/app.js?list='+id]) {
      const request=new Request('https://devonzuegel.com'+path);
      assert.equal(await (await worker.fetch(request)).text(),'origin');
      assert.equal(calls.at(-1),request);
    }
    assert.equal((await worker.fetch(new Request('https://devonzuegel.com/concerts/?list=bad'))).status,404);
    assert.equal(calls.length,2);
  } finally {globalThis.fetch=original;}
});
test('image proxy uses a fixed upstream, sends no cookies, and preserves unavailable states',async()=>{
  const original=globalThis.fetch;
  let status=200;
  globalThis.fetch=async (url,options)=>{
    assert.equal(url,'https://concerts-api-six.vercel.app/api/share-image?list='+id);
    assert.equal(options.headers,undefined);
    return new Response('image',{status});
  };
  try {
    const request=new Request('https://devonzuegel.com/concerts/share-image?list='+id,{headers:{Cookie:'private=value'}});
    const response=await worker.fetch(request);
    assert.equal(response.headers.get('content-type'),'image/png');
    assert.equal(response.headers.get('cache-control'),'no-store');
    status=404;assert.equal((await worker.fetch(request)).status,404);
    status=500;assert.equal((await worker.fetch(request)).status,503);
  } finally {globalThis.fetch=original;}
});
