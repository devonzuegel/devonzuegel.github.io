import test from 'node:test';
import assert from 'node:assert/strict';
import {PublicReadCache} from '../server/public-read-cache.mjs';
test('public metadata cache expires, isolates mutations, and never caches private data',()=>{
 let now=0;const cache=new PublicReadCache({ttl:10,maxBytes:100,now:()=>now});
 cache.set('feed',{events:[1]});const value=cache.get('feed');value.events.push(2);assert.deepEqual(cache.get('feed'),{events:[1]});
 for(const key of ['profile:devon','shared-list:abc','oauth:secret','list-index:devon']){cache.set(key,{private:true});assert.equal(cache.get(key),undefined);}
 now=11;assert.equal(cache.get('feed'),undefined);assert.equal(cache.bytes,0);
 cache.set('feed',{a:'x'.repeat(200)});assert.equal(cache.get('feed'),undefined);
 cache.set('media:a',{a:1});cache.delete('media:a');assert.equal(cache.get('media:a'),undefined);
});
