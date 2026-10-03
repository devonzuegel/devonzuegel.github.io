import test from 'node:test';
import assert from 'node:assert/strict';
import {previewPNG} from '../server/share-preview.mjs';
import {listMetadata,sharedListLink} from '../shared/list-metadata.js';
import {metadataHTML} from '../shared/metadata-html.js';
const list={id:'abcdefghijklmnopqrstuvwxyzABCDEF',title:'Ideas for where we could go dancing on Sat, Oct 3 💃',sharedBy:'devon',updatedAt:'2026-10-03T05:37:00Z',events:[{date:'2026-10-03',venue:{locality:'San Francisco'}},{date:'2026-10-03',venue:{locality:'San Francisco'}}]};
const url=sharedListLink(list.id,'https://devonzuegel.com');
test('server response contains per-list OG and Twitter metadata before JavaScript',()=>{
 const html=metadataHTML(list,url);
 assert.match(html,/property="og:title" content="Ideas for where/);
 assert.match(html,/name="twitter:card" content="summary_large_image"/);
 assert.match(html,/property="og:image:width" content="1200"/);
 assert.match(html,/Shared by devon · 2 concerts · San Francisco · Oct 3, 2026/);
 assert.equal(url,'https://devonzuegel.com/concerts/?list='+list.id);
 assert.match(listMetadata(list,url).image,/^https:\/\/devonzuegel.com\/concerts\/share-image\?/);
 assert.equal(listMetadata(list,url).url,url);
 assert.notEqual(listMetadata({...list,updatedAt:'2026-10-04'},url).image,listMetadata(list,url).image);
});
test('untrusted title and username cannot inject HTML or script',()=>{
 const html=metadataHTML({...list,title:'</title><script>alert(1)</script>',sharedBy:'" onload="alert(1)'},url,'https://devonzuegel.com/concerts/');
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('&lt;script&gt;'));
});
test('preview is a real PNG at social card dimensions',async()=>{
 const png=await previewPNG(list,url);
 assert.equal(png.subarray(1,4).toString(),'PNG');
 assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
});
