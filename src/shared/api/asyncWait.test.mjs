import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { asyncWait } from './asyncWait.js';

test('poll delay aborts immediately and releases listeners', async () => {
  const controller = new AbortController();
  const pending = asyncWait(10000, controller.signal);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 1);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('already cancelled poll never starts a new wait', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(asyncWait(10000, controller.signal), { name: 'AbortError' });
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('completed poll delay removes the abort listener', async () => {
  const controller = new AbortController();
  await asyncWait(1, controller.signal);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});
