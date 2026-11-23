import {gzipSync,gunzipSync} from 'node:zlib';
export const encodeRecord=value=>'gz:'+gzipSync(Buffer.from(JSON.stringify(value))).toString('base64');
export const decodeRecord=raw=>raw==null?null:JSON.parse(raw.startsWith('gz:')?gunzipSync(Buffer.from(raw.slice(3),'base64')).toString():raw);
export async function cloudflareCommand(body) {
 const response=await fetch(process.env.CONCERTS_STORAGE_URL,{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.CONCERTS_STORAGE_SECRET}`},
  body:JSON.stringify(body),signal:AbortSignal.timeout(15000),
 }).catch(()=>{throw new Error('Sync storage is temporarily unavailable.');});
 if(!response.ok)throw new Error('Sync storage is temporarily unavailable.');
 return response.json();
}
export async function cloudflareGet(key){const row=await cloudflareCommand({action:'get',key});return decodeRecord(row.raw);}
export async function cloudflareUpdate(key,fn){
 for(let i=0;i<8;i++){
  const row=await cloudflareCommand({action:'get',key});
  const next=await fn(decodeRecord(row.raw));
  const result=await cloudflareCommand({action:'cas',key,version:row.version,raw:encodeRecord(next)});
  if(result.ok)return next;
 }
 throw new Error('Another device is saving. Please try again.');
}
