import * as cheerio from "cheerio";
import { clean, parseLabeledTimes } from "./parsers.mjs";
import { localToISO, normalize } from "../shared/core.js";

const ticketHosts = /(^|\.)(tixr\.com|axs\.com|eventbrite\.com|ticketmaster\.com|seetickets\.us|dice\.fm|etix\.com|ticketweb\.com)$/i;
export function detailPage(event, html, url) {
  const $ = cheerio.load(html);
  const objects = [];
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if ([value["@type"]].flat().some(t => /^(MusicEvent|Event|Festival)$/.test(t))) objects.push(value);
    for (const child of Object.values(value)) if (typeof child === "object") {
      if (Array.isArray(child)) child.forEach(walk); else walk(child);
    }
  }
  $('script[type="application/ld+json"]').each((_, node) => {
    try { walk(JSON.parse($(node).text())); } catch {}
  });
  const sameName = name => {
    const a = normalize(name), b = normalize(event.title);
    return a && b && (a === b || a.startsWith(b + " ") || b.startsWith(a + " "));
  };
  const patch = {};
  for (const item of objects) {
    if (!sameName(item.name) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(item.startDate || "")) continue;
    let date = item.startDate.slice(0, 10), time = item.startDate.slice(11, 16);
    if (/(Z|[+-]\d{2}:?\d{2})$/.test(item.startDate)) {
      const start = new Date(item.startDate);
      if (!Number.isFinite(+start)) continue;
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {timeZone:event.timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(start).map(p => [p.type,p.value]));
      date = `${parts.year}-${parts.month}-${parts.day}`; time = `${parts.hour}:${parts.minute}`;
    }
    if (date !== event.date) continue;
    Object.assign(patch, {time, showTime:time, timeKind:"show", startAt:localToISO(date,time,event.timezone)});
    if (item.description) patch.description = clean(cheerio.load(item.description).text());
    if (item.image) patch.image = [item.image].flat()[0]?.url || [item.image].flat()[0];
    if (item.performer) patch.artists = [item.performer].flat().map(p=>({name:clean(p.name)})).filter(p=>p.name);
    break;
  }
  // Only use explicitly labelled times in the event's main content, never site-wide hours.
  const heading = $("h1").first();
  if (!patch.time && sameName(heading.text())) {
    const content = heading.closest('article,[itemtype$="Event"]').first();
    if (content.length) {
      const body = content.clone();
      body.find("h1,script,style,nav,footer").remove();
      const times = parseLabeledTimes(body.text());
      const time = times.showTime || times.doorsTime;
      if (time) Object.assign(patch, times, {time,timeKind:times.showTime?"show":"doors",startAt:localToISO(event.date,time,event.timezone)});
    }
  }
  const links = [];
  $('a[href],form[action]').each((_, node) => {
    const el = $(node);
    if (!/tickets?|buy|book/i.test(el.text())) return;
    try {
      const next = new URL(el.attr("href") || el.attr("action"), url);
      if (next.protocol === "https:" && ticketHosts.test(next.hostname) && next.href !== url) links.push(next.href);
    } catch {}
  });
  return {patch, links:[...new Set(links)].slice(0,2)};
}

export async function enrichDetails(event, fetchPage) {
  if (event.time) return event;
  const queue = [...new Set([event.ticketUrl, event.sources?.[0]?.url].filter(Boolean))];
  const visited = new Set();
  let result = {...event};
  while (queue.length && visited.size < 3 && !result.time) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      const {patch,links} = detailPage(event, await fetchPage(url), url);
      queue.push(...links);
      if (Object.keys(patch).length) {
        result = {...result,...patch,provenance:{...result.provenance,...Object.fromEntries(Object.keys(patch).map(field=>[field,{secondary:true,sources:[{name:"Ticket / event details",url}],match:"Linked event page; matching title and date"}]))},sources:[...result.sources,{name:"Event details",url}]};
        if (ticketHosts.test(new URL(url).hostname)) result.ticketUrl = url;
      }
    } catch { /* A blocked ticket page must not remove the calendar listing. */ }
  }
  return result;
}
