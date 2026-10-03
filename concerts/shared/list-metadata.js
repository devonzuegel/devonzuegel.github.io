export function sharedListLink(id, origin) {
  const url=new URL('/concerts/',origin);
  url.searchParams.set('list',id);
  return url.href;
}
export function listMetadata(list,shareURL) {
  const dates=list.events.map(e=>e.date).filter(Boolean).sort();
  const date=value=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
  const range=dates.length ? (dates[0]===dates.at(-1)?date(dates[0]):`${date(dates[0])} – ${date(dates.at(-1))}`) : '';
  const cities=[...new Set(list.events.map(e=>e.venue?.locality).filter(Boolean))];
  const count=`${list.events.length} concert${list.events.length===1?'':'s'}`;
  const description=[`Shared by ${list.sharedBy||'list owner'}`,count,cities.join(', '),range].filter(Boolean).join(' · ');
  const image=new URL('/concerts/share-image',shareURL);image.searchParams.set('list',list.id);image.searchParams.set('v',list.updatedAt);
  return {title:list.title,description,count,cities:cities.join(' · '),range,url:shareURL,image:image.href,imageAlt:`${list.title} — ${description}`};
}
export function setListMetadata(list,shareURL) {
  const meta=listMetadata(list,shareURL);
  const values={'og:title':meta.title,'og:description':meta.description,'og:type':'website','og:site_name':'Concert Tracker','og:url':meta.url,'og:image':meta.image,'og:image:type':'image/png','og:image:width':'1200','og:image:height':'630','og:image:alt':meta.imageAlt,'twitter:card':'summary_large_image','twitter:title':meta.title,'twitter:description':meta.description,'twitter:image':meta.image,'twitter:image:alt':meta.imageAlt,description:meta.description};
  for(const [key,value] of Object.entries(values)) {
    const attr=key.startsWith('og:')?'property':'name';
    let el=document.head.querySelector(`meta[${attr}="${key}"]`);
    if(!el){el=document.createElement('meta');el.setAttribute(attr,key);document.head.append(el);}
    el.content=value;
  }
  let canonical=document.head.querySelector('link[rel="canonical"]');
  if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}
  canonical.href=meta.url;
}
