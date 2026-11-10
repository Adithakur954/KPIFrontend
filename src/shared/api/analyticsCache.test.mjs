import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoundedAnalyticsCache, analyticsCacheScope, invalidateAnalyticsCache } from './analyticsCache.js';

test('analytics entries expire and reads do not extend stale data lifetime', () => {
  let now=0;const cache=new BoundedAnalyticsCache(2,100,()=>now);
  cache.set('a',{value:0});now=99;assert.equal(cache.get('a').value,0);
  now=100;assert.equal(cache.has('a'),false);assert.equal(cache.size,0);
});

test('analytics cache bounds entries and evicts the least recently used dataset', () => {
  const cache=new BoundedAnalyticsCache(2);cache.set('a',1).set('b',2);
  assert.equal(cache.get('a'),1);cache.set('c',3);
  assert.equal(cache.has('b'),false);assert.equal(cache.size,2);
  cache.clear();assert.equal(cache.size,0);assert.equal(cache.expiry.size,0);
});

test('session/company change and explicit refresh invalidate analytics scope', () => {
  const values=new Map([['authToken','session-a'],['user','{"id":1,"companyId":10}']]);const events=[];
  globalThis.window={localStorage:{getItem:key=>values.get(key)},dispatchEvent:event=>events.push(event.type)};
  try {
    const first=analyticsCacheScope();values.set('authToken','session-b');assert.notEqual(analyticsCacheScope(),first);
    const second=analyticsCacheScope();values.set('user','{"id":2,"companyId":20}');assert.notEqual(analyticsCacheScope(),second);
    const third=analyticsCacheScope();invalidateAnalyticsCache();assert.notEqual(analyticsCacheScope(),third);
    assert.deepEqual(events,['analytics:invalidate']);
  } finally { delete globalThis.window; }
});
