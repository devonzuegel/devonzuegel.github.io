import test from 'node:test';
import assert from 'node:assert/strict';
import {concertWeather} from '../server/weather.mjs';
import {weatherWindow,weatherMarkup,weatherCondition} from '../shared/weather-strip.js';
const event={date:'2026-11-28',time:'23:30',timezone:'America/New_York'};
test('unknown ending is an explicit planning window crossing midnight',()=>{
 const w=weatherWindow(event);
 assert.equal(new Date(w.to).toISOString(),'2026-11-29T03:30:00.000Z');
 assert.equal(w.knownEnd,false);
 const html=weatherMarkup({status:'ok',timezone:event.timezone,updatedAt:'2026-11-23T12:00Z',hours:[{time:'2026-11-29T00:00',temp:70,feels:71,rain:null,wind:3,code:0,day:false}]},event);
 assert.match(html,/End time unknown/); assert.match(html,/Next day/); assert.match(html,/— rain/);
});
test('known end uses venue timezone and missing start is not invented',()=>{
 const w=weatherWindow({...event,endAt:'2026-11-29T10:00:00Z'});
 assert.equal(w.knownEnd,true); assert.equal(new Date(w.to).toISOString(),'2026-11-29T05:00:00.000Z');
 assert.equal(weatherWindow({...event,time:''}),null);
});
test('past and distant shows do not fetch or fabricate forecasts',async()=>{
 const options={now:new Date('2026-11-23T15:00Z'),fetchJSON:()=>{throw Error('should not fetch');}};
 assert.equal((await concertWeather({lat:25,lng:-80,date:'2027-01-01'},options)).status,'too-early');
 assert.equal((await concertWeather({lat:25,lng:-80,date:'2026-11-22'},options)).status,'past');
 await assert.rejects(concertWeather({lat:100,lng:1,date:event.date},options),/valid venue/);
});
test('forecast requests use explicit units, null handling and cache',async()=>{
 let calls=0;
 const options={now:new Date('2026-11-23T15:00Z'),fetchJSON:async url=>{calls++;const u=new URL(url);assert.equal(u.searchParams.get('temperature_unit'),'fahrenheit');return {timezone:event.timezone,hourly:{time:['2026-11-28T23:00'],temperature_2m:[null],precipitation_probability:[0]}};}};
 const data=await concertWeather({lat:25.5,lng:-80.5,date:event.date},options);
 assert.equal(data.hours[0].temp,null);assert.equal(data.hours[0].rain,0);
 await concertWeather({lat:25.5,lng:-80.5,date:event.date},options);assert.equal(calls,1);
 assert.deepEqual(weatherCondition(95,true),['⛈','Thunderstorms']);
});

test('extended hourly data preserves zero values and renders distinct forecast layers', async () => {
 const forecast = await concertWeather({lat:40,lng:-73,date:event.date},{
  now:new Date('2026-11-23T15:00Z'),
  fetchJSON:async url=>{
   const params = new URL(url).searchParams;
   assert.equal(params.get('precipitation_unit'),'inch');
   for (const key of ['cloud_cover','precipitation','uv_index','wind_gusts_10m','wind_direction_10m'])
    assert.ok(params.get('hourly').split(',').includes(key));
   return {timezone:event.timezone,hourly:{time:['2026-11-28T23:00','2026-11-29T00:00'],
    temperature_2m:[58,57],apparent_temperature:[54,53],cloud_cover:[100,null],
    precipitation_probability:[72,0],precipitation:[.13,0],uv_index:[0,null],
    wind_speed_10m:[9,8],wind_gusts_10m:[15,13],wind_direction_10m:[135,180]}};
  },
 });
 assert.equal(forecast.hours[0].uv,0);
 assert.equal(forecast.hours[1].cloud,null);
 const markup = weatherMarkup(forecast,event);
 for (const layer of ['show-band','cloud-layer','rain-layer','amount-layer','uv-layer','air-line','wind-line'])
  assert.ok(markup.includes('weather-'+layer));
 assert.match(markup,/72% rain · 0\.13 in/);
 assert.match(markup,/9 mph SE wind · gusts 15 mph/);
 assert.match(markup,/UV 0\.0/);
});
