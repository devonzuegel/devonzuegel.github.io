import {metadataHTML} from '../concerts/shared/metadata-html.js';
import {sharedListLink} from '../concerts/shared/list-metadata.js';

const api='https://concerts-api-six.vercel.app';
const unavailable=status=>new Response('Shared list unavailable.',{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
export default {
  async fetch(request) {
    const url=new URL(request.url);
    const image=url.pathname==='/concerts/share-image';
    const page=['/concerts/','/concerts/index.html'].includes(url.pathname)&&url.searchParams.has('list');
    if(!image&&!page) return fetch(request);
    if(!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
    const id=url.searchParams.get('list');
    if(!/^[A-Za-z0-9_-]{20,100}$/.test(id||'')) return unavailable(404);
    try {
      if(image) {
        const upstream=await fetch(`${api}/api/share-image?list=${encodeURIComponent(id)}`,{method:request.method,signal:AbortSignal.timeout(20000)});
        if(!upstream.ok) return unavailable(upstream.status===404?404:503);
        return new Response(upstream.body,{headers:{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
      }
      const data=await fetch(`${api}/api/concerts?action=shared-list&id=${encodeURIComponent(id)}`,{signal:AbortSignal.timeout(10000)});
      if(!data.ok) return unavailable(data.status===404?404:503);
      const list=await data.json();
      // A same-zone fetch goes directly to the existing GitHub Pages origin.
      const origin=new URL('/concerts/',url);
      const response=await fetch(new Request(origin,{method:'GET'}));
      if(!response.ok) return unavailable(503);
      const headers=new Headers(response.headers);
      for(const name of ['Content-Length','Content-Encoding','ETag','Last-Modified']) headers.delete(name);
      headers.set('Cache-Control','no-store');
      const rewriter=new HTMLRewriter()
        .on('title, meta[name="description"], meta[name="author"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]',{element(el){el.remove();}})
        .on('head',{element(el){el.append(metadataHTML(list,sharedListLink(id,url.origin)),{html:true});}});
      const result=rewriter.transform(new Response(response.body,{headers}));
      return request.method==='HEAD'?new Response(null,{headers:result.headers}):result;
    } catch { return unavailable(503); }
  }
};
