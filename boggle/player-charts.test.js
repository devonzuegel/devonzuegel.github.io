const assert = require('node:assert/strict');
const { summarize, atLeast } = require('./player-charts.js');
function player(name, games, extra = {}) {
  return {player:name, fullData:{sessions:Array.from({length:games}, () => ({})).concat([{early:true}]), ...extra}};
}
const counts = [0,1,2,3,5,6,10,11,20,21,50,51,100,101,400];
const data = summarize(counts.map((n,i) => player('Player '+i,n)).concat([player('Test',999,{isTest:true})]));
assert.deepEqual(data.buckets.map(b => b.players.length), [1,1,1,2,2,2,2,2,2]);
assert.equal(data.max,400);
assert.equal(data.rows.length,counts.length);
assert.equal(data.rows[0].games,400);
assert.equal(data.buckets.flatMap(b => b.players).length,counts.length);
assert.equal(atLeast(data.rows,0),15);
assert.equal(atLeast(data.rows,11),8);
assert.equal(atLeast(data.rows,400),1);
assert.equal(atLeast(data.rows,401),0);
assert.deepEqual(summarize([player('Z',5),player('A',5)]).rows.map(p => p.name), ['A','Z']);
assert.equal(summarize([{player:'Missing data'}]).rows[0].games,0);
assert.equal(summarize([]).max,0);
assert.equal(atLeast([],0),0);
console.log('Player chart checks passed: bucket edges, filtering, ranking, ties, thresholds, and empty data.');
