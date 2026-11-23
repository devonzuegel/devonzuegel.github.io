import test from 'node:test';
import assert from 'node:assert/strict';
import { concertChoices } from '../shared/share-lists.js';
const now = new Date('2026-11-23T05:30:00Z');
const event = (id, date, extra = {}) => ({id,title:id,date,timezone:'America/New_York',venue:{name:'Venue'},...extra});
test('past shows start collapsed after upcoming shows without dropping selected checkboxes', () => {
 const html=concertChoices([event('old','2026-11-20'),event('future','2026-11-25')],new Set(['old']),false,now);
 assert.match(html,/<details class="shared-past-shows">/);
 assert.match(html,/Past shows \(1\)/);
 assert.match(html,/1 selected/);
 assert.match(html,/value="old" checked/);
 assert.ok(html.indexOf('value="future"') < html.indexOf('<details'));
});
test('today, ongoing festivals, unknown dates and local timezone boundaries remain visible', () => {
 const html=concertChoices([event('today','2026-11-23'),event('festival','2026-11-20',{endDate:'2026-11-24'}),event('unknown',null),event('pacific','2026-11-22',{timezone:'America/Los_Angeles'})],new Set(),false,now);
 assert.ok(!html.includes('shared-past-shows'));
});
