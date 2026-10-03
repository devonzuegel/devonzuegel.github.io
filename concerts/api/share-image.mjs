import {readList} from '../server/shared-lists.mjs';
import {previewPNG} from '../server/share-preview.mjs';
import {sharedListLink} from '../shared/list-metadata.js';

export default async function handler(req,res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, HEAD');return res.end();}
  try {
    const request=new URL(req.url,'https://devonzuegel.com');
    const list=await readList(request.searchParams.get('list'));
    res.setHeader('Content-Type','image/png');
    return res.end(req.method==='HEAD'?undefined:await previewPNG(list,sharedListLink(list.id,'https://devonzuegel.com')));
  } catch(error) {
    res.statusCode=error.status===404?404:503;
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    res.end('Shared list image unavailable.');
  }
}
