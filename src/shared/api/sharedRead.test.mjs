import test from 'node:test';
import assert from 'node:assert/strict';
import { sharedRead } from './sharedRead.js';

const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };

test('concurrent reads share one request but own their results; settled reads are fresh', async () => {
  const gate = deferred(); let requests = 0;
  const load = () => { requests++; return gate.promise; };
  const a = sharedRead('same', load), b = sharedRead('same', load);
  gate.resolve({ data: { value: 1 } });
  const [first, second] = await Promise.all([a,b]);
  first.data.value = 2;
  assert.equal(second.data.value, 1); assert.equal(requests, 1);
  await sharedRead('same', load); assert.equal(requests, 2);
});

test('aborting one subscriber does not cancel another subscriber', async () => {
  const gate = deferred(); const a = new AbortController(), b = new AbortController(); let underlying;
  const load = signal => { underlying=signal; return gate.promise; };
  const first = sharedRead('cancel-one', load, a.signal);
  const second = sharedRead('cancel-one', load, b.signal);
  await Promise.resolve(); a.abort();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal(underlying.aborted, false);
  gate.resolve({ ok: true }); assert.deepEqual(await second, { ok: true });
});

test('last subscriber cancellation stops the request and next call can retry', async () => {
  const gate = deferred(), controller = new AbortController(); let underlying;
  const first = sharedRead('cancel-all', signal => { underlying=signal; return gate.promise; }, controller.signal);
  await Promise.resolve(); controller.abort();
  await assert.rejects(first, { name: 'AbortError' }); assert.equal(underlying.aborted, true);
  assert.equal(await sharedRead('cancel-all', () => Promise.resolve(42)), 42);
  gate.resolve(null);
});

test('identities are independent and errors do not poison retries', async () => {
  assert.deepEqual(await Promise.all([sharedRead('tenant-a', () => Promise.resolve('a')), sharedRead('tenant-b', () => Promise.resolve('b'))]), ['a','b']);
  await assert.rejects(sharedRead('retry', () => Promise.reject(new Error('offline'))), /offline/);
  assert.equal(await sharedRead('retry', () => Promise.resolve('fresh')), 'fresh');
});
