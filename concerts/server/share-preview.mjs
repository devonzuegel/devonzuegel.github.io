import {readFile} from 'node:fs/promises';
import satori from 'satori';
import {Resvg} from '@resvg/resvg-js';
import {listMetadata} from '../shared/list-metadata.js';
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
