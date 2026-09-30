import assert from 'node:assert/strict';
// Source-extracted from EffectQueue.ts at 9fd6e0b; TypeScript annotations removed.
// This is not an import/run of the complete repository or a Phaser lifecycle test.
class EffectQueue {
  effects = [];
  running = false;
  enqueue(effect) { this.effects.push(effect); }
  clear() { this.effects = []; }
  async drain() {
    if (this.running) return;
    this.running = true;
    try { while (this.effects.length > 0) { const effect = this.effects.shift(); if (effect) await effect(); } }
    finally { this.running = false; }
  }
}
const log = [];
const queue = new EffectQueue();
let release;
queue.enqueue(() => new Promise(resolve => { release = () => { log.push('old-completed'); resolve(); }; }));
const first = queue.drain();
queue.clear();
queue.enqueue(() => { log.push('new-effect'); });
await queue.drain();
assert.deepEqual(log, []);
release();
await first;
assert.deepEqual(log, ['old-completed', 'new-effect']);
const scale = Math.min(390 / 1280, 844 / 720);
assert.equal(58 * scale, 17.671875);
assert.equal(10 * scale, 3.046875);
assert.equal([2167272,2408784,2190788,2556754,2616896,2344966].reduce((a,b)=>a+b,0),14285460);
console.log('BASELINE_MICRO_PROBES_PASS: old queue behavior reproduced; dimensions calculated; NOT full-game acceptance');
