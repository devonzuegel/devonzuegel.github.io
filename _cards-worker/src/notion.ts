import { Env, HttpError } from './core.ts';
import { localClock, ratings, schedule } from './schedule.ts';
export async function notion(e: Env, path: string, method = 'GET', data?: unknown) {
  if (!e.NOTION_TOKEN) throw new HttpError(503, 'Notion is not connected yet.');
  let response: Response;
  try { response = await fetch(`https://api.notion.com/v1/${path}`, {
    method, headers: { Authorization: `Bearer ${e.NOTION_TOKEN}`, 'Notion-Version': '2025-09-03', 'Content-Type':'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(15000),
  }); } catch { throw new HttpError(502, 'Notion could not confirm the request. Retry to check its status.'); }
  if (!response.ok) throw new HttpError(response.status === 429 ? 429 : 502, response.status === 429 ? 'Notion is busy. Please try again in a moment.' : 'Notion could not complete the request. Check the integration’s database access.');
  return response.json() as Promise<any>;
}
const plain = (values: any[] = []) => values.map(x=>x.plain_text ?? x.text?.content ?? '').join('').replace(/<br\s*\/?\s*>/gi, '\n');
export function card(page: any) {
  const p = page.properties;
  const interval = p['Interval (days)']?.number ?? null, ease = p.Ease?.number ?? null;
  return {
    id: page.id, version: page.last_edited_time, title: plain(p.Card?.title),
    prompt: plain(p.Prompt?.rich_text) || plain(p.Card?.title), answer: plain(p.Answer?.rich_text),
    due: p.Due?.date?.start ?? null, interval, ease,
    tags: (p.Tags?.multi_select ?? []).map((x: any)=>x.name),
    url: `https://www.notion.so/${page.id.replaceAll('-', '')}`,
    next: Object.fromEntries(ratings.map(r => [r, schedule(interval, ease, r).interval])),
  };
}
export async function dueCards(e: Env, timezone: string, at = new Date(), cursor?: string) {
  const day = localClock(at, timezone).day;
  // Query a superset, then compare date-only values in the owner's timezone and
  // full timestamps as instants. Notion's date filter alone cannot express both.
  const cutoff = new Date(Math.max(at.getTime(), Date.parse(`${day}T23:59:59.999Z`))).toISOString();
  const result = await notion(e, `data_sources/${e.NOTION_DATA_SOURCE}/query`, 'POST', {
    page_size: 50, ...(cursor ? { start_cursor: cursor } : {}),
    filter: { or: [{ property:'Due', date:{ is_empty:true } }, { property:'Due', date:{ on_or_before:cutoff } }] },
    sorts: [{ property:'Due', direction:'ascending' }],
  });
  // Date-only cards are due at local midnight; timestamps must actually have passed.
  const cards = result.results.map(card).filter((c: ReturnType<typeof card>) => !c.due || (c.due.length === 10 ? c.due <= day : Date.parse(c.due) <= at.getTime()));
  return { cards, cursor: result.has_more ? result.next_cursor : null };
}
export async function nextDuePage(e: Env, timezone: string, at = new Date(), cursor?: string) {
  // Walk pages containing later-today timestamps instead of incorrectly claiming an empty queue.
  for (let i = 0; i < 20; i++) {
    const page = await dueCards(e, timezone, at, cursor);
    if (page.cards.length || !page.cursor) return page;
    cursor = page.cursor;
  }
  throw new HttpError(503, 'The queue is large. Please try again shortly.');
}
export async function review(e: Env, input: any) {
  const { id, cardId, rating, version } = input;
  if (!/^[\da-f-]{36}$/i.test(id) || !/^[\da-f-]{36}$/i.test(cardId) || !ratings.includes(rating) || typeof version !== 'string' || version.length > 40)
    throw new HttpError(400, 'Invalid review.');
  let operation: any = await e.DB.prepare('SELECT * FROM reviews WHERE id=?').bind(id).first();
  if (operation && (operation.card_id !== cardId || operation.rating !== rating || operation.expected_version !== version)) throw new HttpError(409, 'This review ID has already been used.');
  if (operation?.state === 'done') return JSON.parse(operation.result);
  if (operation?.state === 'conflict') throw new HttpError(409, 'This card changed. Refresh your queue before rating it again.');
  let page = await notion(e, `pages/${cardId}`);
  if (page.parent?.data_source_id !== e.NOTION_DATA_SOURCE || page.archived || page.in_trash) {
    if (operation) await e.DB.prepare("UPDATE reviews SET state='conflict' WHERE id=? AND state='pending'").bind(id).run();
    throw new HttpError(404, 'Card is not in this database.');
  }
  if (!operation) {
    if (page.last_edited_time !== version) throw new HttpError(409, 'This card changed. Refresh your queue before rating it again.');
    const current = card(page), result = schedule(current.interval, current.ease, rating);
    const properties = {
      Due: { date:{ start:result.due } }, 'Last Reviewed':{ date:{ start:result.reviewed } },
      'Interval (days)':{ number:result.interval }, Ease:{ number:result.ease },
    };
    await e.DB.prepare('INSERT OR IGNORE INTO reviews(id,card_id,rating,expected_version,payload,result,created_at) VALUES(?,?,?,?,?,?,?)')
      .bind(id, cardId, rating, version, JSON.stringify(properties), JSON.stringify(result), Date.now()).run();
    operation = await e.DB.prepare('SELECT * FROM reviews WHERE id=?').bind(id).first();
    if (!operation) throw new HttpError(409, 'Another review of this card is pending. Retry it on the device where you started.');
    if (operation.card_id !== cardId || operation.rating !== rating || operation.expected_version !== version) throw new HttpError(409, 'This review ID has already been used.');
    // Re-read after acquiring the card lock, in case another device just finished.
    page = await notion(e, `pages/${cardId}`);
    if (page.parent?.data_source_id !== e.NOTION_DATA_SOURCE || page.archived || page.in_trash) {
      await e.DB.prepare("UPDATE reviews SET state='conflict' WHERE id=? AND state='pending'").bind(id).run();
      throw new HttpError(404, 'Card is not in this database.');
    }
  }
  const properties = JSON.parse(operation.payload), result = JSON.parse(operation.result);
  const p = page.properties;
  const sameDate = (a: string | undefined, b: string) => !!a && Date.parse(a) === Date.parse(b);
  const alreadyApplied = sameDate(p.Due?.date?.start, result.due) && sameDate(p['Last Reviewed']?.date?.start, result.reviewed) && p.Ease?.number === result.ease && p['Interval (days)']?.number === result.interval;
  if (!alreadyApplied) {
    if (page.last_edited_time !== operation.expected_version) {
      await e.DB.prepare("UPDATE reviews SET state='conflict' WHERE id=? AND state='pending'").bind(id).run();
      throw new HttpError(409, 'This card changed in Notion. Refresh before rating it again.');
    }
    // Retries apply the stored absolute values; they never advance the interval twice.
    await notion(e, `pages/${cardId}`, 'PATCH', { properties });
  }
  await e.DB.prepare("UPDATE reviews SET state='done' WHERE id=?").bind(id).run();
  return result;
}
