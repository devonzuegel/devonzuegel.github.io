const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function weatherWindow(event) {
  const time = event.showTime || event.time || event.doorsTime;
  if (!event.date || !/^\d{2}:\d{2}$/.test(time || '')) return null;
  // Venue-local wall time: strings from Open-Meteo use the same convention.
  const start = Date.parse(`${event.date}T${time}:00Z`);
  if (!Number.isFinite(start)) return null;
  let end = null;
  if (event.endAt && event.timezone) {
    try {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:event.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(event.endAt)).map(p=>[p.type,p.value]));
      end = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`);
    } catch {}
  }
  const knownEnd=Number.isFinite(end) && end>start && end-start<=24*3600000;
  return {from:Math.floor(start/3600000)*3600000-3600000,to:knownEnd?end:start+4*3600000,knownEnd,start};
}
export function weatherCondition(code,day) {
  if(code===0)return [day?'☀':'☾',day?'Clear':'Clear night'];
  if([1,2].includes(code))return ['⛅','Partly cloudy'];
  if(code===3)return ['☁','Cloudy'];
  if([45,48].includes(code))return ['≋','Fog'];
  if([71,73,75,77,85,86].includes(code))return ['❄','Snow'];
  if([95,96,99].includes(code))return ['⛈','Thunderstorms'];
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return ['☂','Rain'];
  return ['—','Conditions unavailable'];
}
export function weatherMarkup(data,event) {
  if(data.status!=='ok')return `<p class="media-notice">${esc(data.message || 'Forecast unavailable.')}</p>`;
  const window=weatherWindow(event);
  if(!window)return '<p class="media-notice">A start time is needed to show hourly weather for this concert.</p>';
  const hours=data.hours.filter(h=>{const t=Date.parse(h.time+'Z');return t>=window.from && t<=window.to;});
  if(!hours.length)return '<p class="media-notice">The forecast does not cover these concert hours yet. Check back closer to the show.</p>';
  const valid=hours.filter(h=>h.temp!==null),temps=valid.map(h=>h.temp),min=Math.min(...temps)-3,max=Math.max(...temps)+3;
  const number=(v,suffix='')=>v==null?'—':`${Math.round(v)}${suffix}`;
  const point=(h,i)=>`${i*90+45},${h.temp===null?45:70-(h.temp-min)/(max-min)*50}`;
  const partial=Date.parse(hours.at(-1).time+'Z')<Math.floor(window.to/3600000)*3600000;
  return `<p class="weather-context">${window.knownEnd?'One hour before the listed start through the listed end.':'End time unknown: showing one hour before to four hours after the listed start.'} ${event.timeKind==='doors'&&!event.showTime?'The listed start is doors opening. ':''}Times at the venue (${esc(data.timezone)}).${partial?' Only part of this window is available.':''}</p>${data.outlook?'<p class="weather-outlook">Early outlook · Hourly details may change substantially this far ahead.</p>':''}<div class="weather-scroll"><div class="weather-chart" style="width:${hours.length*90}px"><svg viewBox="0 0 ${hours.length*90} 82" aria-label="Hourly temperature trend" role="img">${hours.map((h,i)=>h.temp===null?'':`<circle cx="${i*90+45}" cy="${point(h,i).split(',')[1]}" r="3" fill="currentColor"/>`).join('')}${hours.slice(1).map((h,i)=>h.temp===null||hours[i].temp===null?'':`<polyline points="${point(hours[i],i)} ${point(h,i+1)}" fill="none" stroke="currentColor" stroke-width="2.5"/>`).join('')}</svg><div class="weather-hours">${hours.map(h=>{const [icon,label]=weatherCondition(h.code,h.day);const hour=Number(h.time.slice(11,13));return `<div class="weather-hour"><time datetime="${esc(h.time)}">${hour%12||12}${hour<12?'am':'pm'}${hour===0?'<small>Next day</small>':''}</time><span class="weather-icon" title="${esc(label)}" aria-label="${esc(label)}">${icon}</span><strong>${number(h.temp,'°F')}</strong><small>Feels ${number(h.feels,'°')}</small><span class="weather-rain" style="--rain:${h.rain==null?0:Math.max(0,Math.min(100,h.rain))}%">${number(h.rain,'%')} rain</span><small>${number(h.wind,' mph')} wind</small></div>`;}).join('')}</div></div></div><p class="weather-credit">Outdoor conditions near the venue · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · Updated ${esc(new Intl.DateTimeFormat('en-US',{timeZone:data.timezone,hour:'numeric',minute:'2-digit'}).format(new Date(data.updatedAt)))}</p>`;
}
