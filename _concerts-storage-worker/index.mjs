const reply = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
 async fetch(request,env) {
  if(!env.STORAGE_SECRET || request.headers.get('Authorization')!==`Bearer ${env.STORAGE_SECRET}`) return reply({error:'Unauthorized'},401);
  if(request.method!=='POST') return reply({error:'Method not allowed'},405);
  try {
   if(Number(request.headers.get('Content-Length'))>2000000)return reply({error:'Record too large'},413);
   const body=await request.text();if(body.length>2000000)return reply({error:'Record too large'},413);
   const {action,key,raw,version}=JSON.parse(body);
   if(typeof key!=='string'||!key.startsWith('concerts:v1:')||key.length>2000)return reply({error:'Invalid key'},400);
   if(action==='get') {
    const row=await env.DB.prepare('SELECT value,version FROM records WHERE key=?').bind(key).first();
    return reply(row?{raw:row.value,version:row.version}:{raw:null,version:0});
   }
   if(action!=='cas'||typeof raw!=='string'||raw.length>1900000||!Number.isSafeInteger(version)||version<0)return reply({error:'Invalid write'},400);
   const result=version===0
    ? await env.DB.prepare('INSERT INTO records (key,value,version) VALUES (?,?,1) ON CONFLICT(key) DO NOTHING').bind(key,raw).run()
    : await env.DB.prepare('UPDATE records SET value=?,version=version+1 WHERE key=? AND version=?').bind(raw,key,version).run();
   return reply({ok:result.meta.changes===1});
  } catch { return reply({error:'Storage request failed'},503); }
 }
};
