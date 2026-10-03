import {listMetadata} from './list-metadata.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function metadataHTML(list,url) {
  const m=listMetadata(list,url);
  const tags={'og:title':m.title,'og:description':m.description,'og:type':'website','og:site_name':'Concert Tracker','og:locale':'en_US','og:url':m.url,'og:image':m.image,'og:image:type':'image/png','og:image:width':'1200','og:image:height':'630','og:image:alt':m.imageAlt,'twitter:card':'summary_large_image','twitter:title':m.title,'twitter:description':m.description,'twitter:image':m.image,'twitter:image:alt':m.imageAlt,description:m.description,author:list.sharedBy};
  return `<title>${esc(m.title)} · Concert Tracker</title><meta name="robots" content="noindex"><link rel="canonical" href="${esc(m.url)}">${Object.entries(tags).map(([key,value])=>`<meta ${key.startsWith('og:')?'property':'name'}="${key}" content="${esc(value)}">`).join('')}`;
}
