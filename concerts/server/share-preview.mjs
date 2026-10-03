import {readFile} from 'node:fs/promises';
import satori from 'satori';
import {Resvg} from '@resvg/resvg-js';
import {listMetadata} from '../shared/list-metadata.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function previewHTML(list,shareURL,appURL) {
  const m=listMetadata(list,shareURL);
  const tags={'og:title':m.title,'og:description':m.description,'og:type':'website','og:site_name':'Concert Tracker','og:locale':'en_US','og:url':m.url,'og:image':m.image,'og:image:type':'image/png','og:image:width':'1200','og:image:height':'630','og:image:alt':m.imageAlt,'twitter:card':'summary_large_image','twitter:title':m.title,'twitter:description':m.description,'twitter:image':m.image,'twitter:image:alt':m.imageAlt,description:m.description,author:list.sharedBy};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.title)} · Concert Tracker</title><meta name="robots" content="noindex"><link rel="canonical" href="${esc(m.url)}">${Object.entries(tags).map(([key,value])=>`<meta ${key.startsWith('og:')?'property':'name'}="${key}" content="${esc(value)}">`).join('')}<style>body{background:#191e1b;color:#e8e9df;font:18px system-ui;max-width:850px;margin:8vh auto;padding:24px}a{color:#eaa17e}img{max-width:100%;border-radius:16px}</style></head><body><h1>${esc(m.title)}</h1><p>${esc(m.description)}</p><p><a id="open-list" href="${esc(appURL)}">Open shared list →</a></p><img src="${esc(m.image)}" alt="${esc(m.imageAlt)}"><script>location.replace(document.getElementById('open-list').href)</script></body></html>`;
}
let fonts;
export async function previewPNG(list,shareURL) {
  fonts ||= Promise.all([400,600].map(async weight=>({name:'Inter',weight,style:'normal',data:await readFile(new URL(`../node_modules/@fontsource/inter/files/inter-latin-${weight}-normal.woff`,import.meta.url))})));
  const m=listMetadata(list,shareURL);
  const text=(children,style={})=>({type:'div',props:{style:{display:'flex',...style},children}});
  const imageTitle=m.title.replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu,'').trim();
  const svg=await satori(text([
    text('CONCERT TRACKER',{fontSize:22,letterSpacing:3,color:'#b0bba6'}),
    text(imageTitle,{fontSize:imageTitle.length>75?48:58,fontWeight:600,lineHeight:1.15,marginTop:42,maxWidth:1010}),
    text(`Shared by ${list.sharedBy||'list owner'}`,{fontSize:26,color:'#b0bba6',marginTop:26}),
    text([text(m.count,{color:'#eda681',fontWeight:600}),text(m.range,{marginLeft:28})],{fontSize:25,marginTop:'auto',paddingTop:30,borderTop:'1px solid #455044'}),
    text(m.cities.length>105?m.cities.slice(0,102)+"…":m.cities,{fontSize:23,color:'#b0bba6',marginTop:14}),
  ],{width:1200,height:630,backgroundColor:'#191e1b',color:'#e8e9df',padding:'50px 64px',fontFamily:'Inter',flexDirection:'column',borderLeft:'12px solid #eda681'}),{width:1200,height:630,fonts:await fonts});
  return new Resvg(svg).render().asPng();
}
