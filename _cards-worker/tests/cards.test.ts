import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import webpush from 'web-push';
import worker from '../src/index.ts';
import { hash, type Env } from '../src/core.ts';
import { schedule, localClock } from '../src/schedule.ts';
import { card, nextDuePage, review } from '../src/notion.ts';
import { reminders, validateSubscription } from '../src/push.ts';
import { progress } from '../src/progress.ts';
const originalFetch = globalThis.fetch;
afterEach(()=>{ globalThis.fetch = originalFetch; });
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_cards.sql', import.meta.url), 'utf8'));
  const wrap = (sql: string, args: any[] = []): any => ({
    bind: (...values: any[]) => wrap(sql, values),
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results:db.prepare(sql).all(...args) }),
    run: async () => ({ meta:{ changes:Number(db.prepare(sql).run(...args).changes) } }),
  });
  const keys = webpush.generateVAPIDKeys();
  const e = { DB:{ prepare:wrap, batch:async (queries: any[])=>Promise.all(queries.map(q=>q.run())) },
    AUTH_LIMIT:{ limit:async()=>({ success:true }) },
    DASHBOARD_ORIGIN:'https://devonzuegel.com', PUBLIC_ORIGIN:'https://cards-api.devonzuegel.com', OWNER_GITHUB_ID:'owner',
    NOTION_DATA_SOURCE:'7c583d6a-698c-470d-8d1e-86f269d502fd', NOTION_TOKEN:'test-only',
    VAPID_PUBLIC_KEY:keys.publicKey, VAPID_PRIVATE_KEY:keys.privateKey, VAPID_SUBJECT:'https://example.com',
  } as unknown as Env;
  return { e, db };
}
function page(e: Env) { return {
  id:'11111111-1111-4111-8111-111111111111', last_edited_time:'2026-09-20T12:00:00.000Z', parent:{ data_source_id:e.NOTION_DATA_SOURCE },
  properties:{ Card:{ title:[{ plain_text:'A card' }] }, Prompt:{ rich_text:[{ plain_text:'Question?' }] }, Answer:{ rich_text:[{ plain_text:'First<br><br>Second' }] }, Due:{ date:{ start:'2026-09-20' } }, 'Last Reviewed':{ date:null }, 'Interval (days)':{ number:2 }, Ease:{ number:2.5 } },
}; }
const operation = (p: any) => ({ id:crypto.randomUUID(), cardId:p.id, version:p.last_edited_time, rating:'good' });
function notionMock(p: any, options: { timeoutAfterWrite?:boolean } = {}) {
  let writes = 0;
  globalThis.fetch = async (_url, init) => {
    if (init?.method === 'PATCH') {
      writes++; Object.assign(p.properties, JSON.parse(init.body as string).properties); p.last_edited_time='2026-09-27T13:00:00.000Z';
      if (options.timeoutAfterWrite) { options.timeoutAfterWrite=false; throw new Error('Connection interrupted'); }
    }
    return Response.json(p);
  };
  return ()=>writes;
}
test('ratings advance, relearn, and constrain intervals and ease', () => {
  const at = new Date('2026-09-27T13:00:00Z');
  assert.equal(schedule(2,2.5,'good',at).interval,5);
  assert.equal(schedule(null,null,'good',at).interval,1);
  assert.equal(schedule(null,null,'easy',at).interval,4);
  assert.equal(schedule(100,1.3,'again',at).ease,1.3);
  assert.equal(schedule(100,2.5,'again',at).due,'2026-09-27T13:10:00.000Z');
  assert.equal(schedule(100000,3.5,'easy',at).interval,3650);
  assert.throws(()=>schedule(1,2.5,'invalid' as any));
});
test('New York reminder hour follows daylight saving time', () => {
  assert.deepEqual(localClock(new Date('2026-07-01T13:00:00Z'),'America/New_York'),{day:'2026-07-01',hour:9});
  assert.deepEqual(localClock(new Date('2026-12-01T14:00:00Z'),'America/New_York'),{day:'2026-12-01',hour:9});
});
test('Notion text preserves plain content and normalizes legacy breaks', () => {
  const {e}=fixture(); assert.equal(card(page(e)).answer,'First\n\nSecond');
});
test('review writes only scheduling fields and duplicate retries do not advance twice', async () => {
  const {e,db}=fixture(), p=page(e), input=operation(p), writes=notionMock(p);
  const answer=JSON.stringify(p.properties.Answer);
  const result=await review(e,input);
  assert.equal(result.interval,5); assert.deepEqual(await review(e,input),result);
  assert.equal(writes(),1); assert.equal(JSON.stringify(p.properties.Answer),answer);
  assert.equal(db.prepare('SELECT state FROM reviews').get()!.state,'done');
});
test('timeout after Notion accepted a write is reconciled without a second write', async () => {
  const {e,db}=fixture(), p=page(e), input=operation(p), writes=notionMock(p,{timeoutAfterWrite:true});
  await assert.rejects(review(e,input),/confirm/);
  assert.equal(db.prepare('SELECT state FROM reviews').get()!.state,'pending');
  assert.equal((await review(e,input)).interval,5); assert.equal(writes(),1);
});
test('stale or foreign cards cannot be changed', async () => {
  const {e}=fixture(), p=page(e), input=operation(p), writes=notionMock(p);
  p.last_edited_time='2026-09-21T12:00:00.000Z';
  await assert.rejects(review(e,input),/changed/);
  p.parent.data_source_id='other'; await assert.rejects(review(e,input),/not in this database/);
  assert.equal(writes(),0);
});
test('a competing review cannot bypass an uncertain pending write', async () => {
  const {e}=fixture(), p=page(e), input=operation(p);
  globalThis.fetch=async (_url,init)=>{ if(init?.method==='PATCH') throw Error(); return Response.json(p); };
  await assert.rejects(review(e,input));
  await assert.rejects(review(e,{...input,id:crypto.randomUUID()}),/pending/);
});
test('external changes after uncertain write clear the pending lock as a conflict', async () => {
  const {e,db}=fixture(), p=page(e), input=operation(p);
  globalThis.fetch=async (_url,init)=>{ if(init?.method==='PATCH') throw Error(); return Response.json(p); };
  await assert.rejects(review(e,input)); p.last_edited_time='2026-09-26T00:00:00Z';
  await assert.rejects(review(e,input),/changed/);
  assert.equal(db.prepare('SELECT state FROM reviews').get()!.state,'conflict');
});
test('queue skips future timestamps and continues pagination to find due cards', async () => {
  const {e}=fixture(), p=page(e); let count=0;
  globalThis.fetch=async (_url,init)=>{
    const query=JSON.parse(init!.body as string); count++;
    if(count===1) { p.properties.Due.date.start='2026-09-27T23:00:00Z'; return Response.json({results:[p],has_more:true,next_cursor:'next'}); }
    assert.equal(query.start_cursor,'next'); p.properties.Due.date.start='2026-09-27';
    return Response.json({results:[p],has_more:false});
  };
  const result=await nextDuePage(e,'America/New_York',new Date('2026-09-27T13:00:00Z'));
  assert.equal(result.cards.length,1); assert.equal(count,2);
});
test('progress preserves confirmed history, ignores pending saves, and uses local review days', async () => {
  const {e,db}=fixture();
  const insert = db.prepare('INSERT INTO reviews(id,card_id,rating,expected_version,state,created_at) VALUES(?,?,?,?,?,?)');
  insert.run('past', 'a', 'good', 'v', 'done', Date.parse('2026-11-22T12:00:00Z'));
  insert.run('saved-later', 'a', 'hard', 'v', 'pending', Date.parse('2026-11-24T04:30:00Z'));
  insert.run('today', 'b', 'easy', 'v', 'done', Date.parse('2026-11-24T05:30:00Z'));
  insert.run('pending', 'c', 'again', 'v', 'pending', Date.parse('2026-11-24T06:30:00Z'));
  db.exec(readFileSync(new URL('../migrations/0002_review_activity.sql', import.meta.url), 'utf8'));
  db.exec("UPDATE reviews SET state='done' WHERE id='saved-later'");
  db.exec("UPDATE reviews SET state='done' WHERE id='saved-later'");
  db.exec("DELETE FROM reviews WHERE state='done'");

  const data = await progress(e, Date.parse('2026-11-24T18:00:00Z'));
  assert.deepEqual(data.days.slice(-3), [
    { date: '2026-11-22', count: 1 }, { date: '2026-11-23', count: 1 }, { date: '2026-11-24', count: 1 },
  ]);
  assert.equal(data.today, 1);
  assert.equal(data.week, 3);
  assert.equal(data.uniqueCards, 2);
  assert.deepEqual(data.ratingCounts, { again:0, hard:1, good:1, easy:1 });
  assert.equal(data.currentStreak, 3);
  assert.equal(data.bestStreak, 3);
  assert.equal((await progress(e, Date.parse('2026-11-25T18:00:00Z'))).currentStreak, 3);
  assert.equal((await progress(e, Date.parse('2026-11-26T18:00:00Z'))).currentStreak, 0);
});
test('private API requires authentication and mutations require exact origin and CSRF', async () => {
  const {e,db}=fixture();
  const get = (path: string, init?:RequestInit)=>worker.fetch(new Request(e.PUBLIC_ORIGIN+path,init),e);
  assert.equal((await get('/api/cards')).status,401);
  assert.equal((await get('/api/progress')).status,401);
  const token='a'.repeat(32);
  db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(await hash(token),'owner','csrf',Math.floor(Date.now()/1000)+600);
  const headers={cookie:`__Host-cards_session=${token}`,origin:e.DASHBOARD_ORIGIN,'content-type':'application/json'};
  assert.equal((await get('/api/settings',{method:'POST',headers,body:'{}'})).status,403);
  const r=await get('/api/settings',{method:'POST',headers:{...headers,'x-csrf-token':'csrf'},body:JSON.stringify({enabled:true,hour:9,timezone:'America/New_York'})});
  assert.equal(r.status,200); assert.equal(r.headers.get('cache-control'),'no-store');
  assert.equal((await get('/api/settings',{method:'POST',headers:{...headers,origin:'https://evil.example','x-csrf-token':'csrf'},body:'{}'})).status,403);
});
function subscription() { const keys=webpush.generateVAPIDKeys(); return {endpoint:'https://web.push.apple.com/test',keys:{p256dh:keys.publicKey,auth:Buffer.alloc(16,1).toString('base64url')}}; }
test('subscription validation blocks arbitrary fetch targets', () => {
  const sub=subscription(); assert.equal(validateSubscription(sub).endpoint,sub.endpoint);
  for(const endpoint of ['https://127.0.0.1/x','http://web.push.apple.com/x','https://web.push.apple.com.evil.example/x','https://web.push.apple.com:444/x']) assert.throws(()=>validateSubscription({...sub,endpoint}));
});
test('cron sends one private encrypted notification per device/day and respects empty queue', async () => {
  const {e,db}=fixture(), p=page(e), sub=subscription();
  db.prepare('INSERT INTO subscriptions VALUES(?,?,?)').run('device',JSON.stringify(sub),0);
  let sent=0, empty=false;
  globalThis.fetch=async (url,init)=>{
    if(String(url).includes('api.notion.com')) return Response.json({results:empty?[]:[p],has_more:false});
    sent++; assert.equal(String(url),sub.endpoint); assert.ok(init!.body); assert.equal((init!.headers as any)['Content-Encoding'],'aes128gcm');
    return new Response(null,{status:201});
  };
  await reminders(e,new Date('2026-09-27T12:00:00Z')); assert.equal(sent,0);
  await reminders(e,new Date('2026-09-27T13:00:00Z'));
  await reminders(e,new Date('2026-09-27T13:15:00Z')); assert.equal(sent,1);
  empty=true; await reminders(e,new Date('2026-09-28T13:00:00Z')); assert.equal(sent,1);
});
test('date-only cards wait for local midnight, while timestamp cards follow their instant', async () => {
  const {e}=fixture(), p=page(e), p2=structuredClone(p), p3=structuredClone(p);
  p.properties.Due.date.start='2026-09-28';
  p2.properties.Due.date.start='2026-09-27';
  p3.properties.Due.date.start='2026-09-28T00:30:00Z';
  globalThis.fetch=async()=>Response.json({results:[p,p2,p3],has_more:false});
  const result=await nextDuePage(e,'America/New_York',new Date('2026-09-28T01:00:00Z'));
  assert.deepEqual(result.cards.map(c=>c.due),['2026-09-27','2026-09-28T00:30:00Z']);
});
test('a card moved after acquiring a review lock is not written', async () => {
  const {e,db}=fixture(), p=page(e); let reads=0,writes=0;
  globalThis.fetch=async (_url,init)=>{
    if(init?.method==='PATCH') writes++;
    if(++reads===2) p.parent.data_source_id='other';
    return Response.json(p);
  };
  await assert.rejects(review(e,operation(p)),/not in this database/);
  assert.equal(writes,0); assert.equal(db.prepare('SELECT state FROM reviews').get()!.state,'conflict');
});
