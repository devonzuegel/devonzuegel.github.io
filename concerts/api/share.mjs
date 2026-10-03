import {readList} from '../server/shared-lists.mjs';
import {previewHTML,previewPNG} from '../server/share-preview.mjs';
export default async function handler(req,res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, HEAD');return res.end();}
  try {
    const origin=process.env.VERCEL?'https://concerts-api-six.vercel.app':'http://127.0.0.1:4317';
    const request=new URL(req.url,origin);
    const list=await readList(request.searchParams.get('list'));
    const canonical=new URL('/api/share',origin);canonical.searchParams.set('list',list.id);
    if(request.searchParams.get('image')==='1') {
      res.setHeader('Content-Type','image/png');
      return res.end(req.method==='HEAD'?undefined:await previewPNG(list,canonical.href));
    }
    const app=new URL('/concerts/',process.env.VERCEL?'https://devonzuegel.com':origin);app.searchParams.set('list',list.id);
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.end(req.method==='HEAD'?undefined:previewHTML(list,canonical.href,app.href));
  } catch(error) {
    res.statusCode=error.status===404?404:503;
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<!doctype html><meta name="robots" content="noindex"><title>Shared list unavailable</title><p>This shared list is unavailable.</p>');
  }
}
