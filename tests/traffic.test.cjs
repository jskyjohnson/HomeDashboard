const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function renderer() {
  const elements = new Map();
  const source = fs.readFileSync(path.join(__dirname, '..', 'board.js'), 'utf8');
  const context = vm.createContext({
    document: { getElementById(id) {
      if (!elements.has(id)) elements.set(id, { style: {}, dataset: {} });
      return elements.get(id);
    } },
    console,
  });
  // Skip browser boot and side-feed requests, but execute the real render and SVG.
  vm.runInContext(source.slice(0, source.lastIndexOf("$('az-line').textContent = LINES")), context);
  vm.runInContext('hydrateSide = () => {}; const realSpark = spark; spark = (vals, ...args) => { globalThis.buckets = vals; return realSpark(vals, ...args); };', context);
  return {
    render(data) {
      context.data = data;
      vm.runInContext('render(data)', context);
      return { buckets: Array.from(context.buckets || []), html: elements.get('t-chart').innerHTML };
    },
  };
}

const hourly = Array.from({ length: 24 }, (_, i) => i);
for (const generated of ['2026-11-15T19:00:01', '2026-11-15T19:00:01Z', '2026-11-15T11:00:01-08:00']) {
  test(`traffic ends at collection hour: ${generated}`, () => {
    const result = renderer().render({ generated, traffic: { hourly } });
    assert.deepEqual(result.buckets, hourly.slice(8, 20));
    assert.match(result.html, /^<svg/);
    assert.doesNotMatch(result.html, /NaN|undefined/);
  });
}

test('UTC midnight does not plot future buckets or wrap into stale data', () => {
  const result = renderer().render({ generated: '2026-11-16T00:01:00', traffic: { hourly } });
  assert.deepEqual(result.buckets, [0]);
  assert.match(result.html, /^<svg/);
});

test('missing traffic degrades to a readable sentence', () => {
  const result = renderer().render({ generated: '2026-11-15T19:00:01' });
  assert.match(result.html, /hourly traffic is unavailable/);
});

test('real live page and traffic feed', { skip: !process.env.LIVE_BOARD_URL }, async () => {
  const url = process.env.LIVE_BOARD_URL;
  const page = await fetch(url);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /id="t-chart"/);
  const response = await fetch(new URL('board.json', url));
  assert.equal(response.status, 200);
  const data = await response.json();
  const result = renderer().render(data);
  const hour = new Date(data.generated + 'Z').getUTCHours();
  assert.deepEqual(result.buckets, data.traffic.hourly.slice(Math.max(0, hour - 11), hour + 1));
  assert.match(result.html, /^<svg/);
  assert.doesNotMatch(result.html, /NaN|undefined/);
  console.log('live HTTP 200, updated renderer uses UTC buckets:', JSON.stringify(result.buckets));
});
