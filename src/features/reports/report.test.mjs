import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch } from '../../shared/api/apiClient.js';
import { number, trendPoints, canQueueMail, normalizeRcaPreset } from './utils.js';

const originalFetch = globalThis.fetch;
let values, events;
beforeEach(() => {
  values = new Map([['authToken', 'test-token'], ['user', '{}']]); events = [];
  globalThis.localStorage = { getItem: key => values.get(key), removeItem: key => values.delete(key) };
  globalThis.window = { dispatchEvent: event => events.push(event.type) };
});
afterEach(() => { globalThis.fetch = originalFetch; delete globalThis.window; delete globalThis.localStorage; });

test('protected GET expires the session without anonymous fallback', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ message: 'Session expired' }, { status: 401 }); };
  await assert.rejects(apiFetch('api/v1/reports', { authRequired: true }), error => error.status === 401);
  assert.equal(calls, 1); assert.equal(values.has('authToken'), false); assert.deepEqual(events, ['auth:unauthorized']);
});
test('binary downloads retain bearer authentication and cancellation signal', async () => {
  const controller = new AbortController();
  globalThis.fetch = async (_, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-token'); assert.equal(options.signal, controller.signal);
    assert.equal('authRequired' in options, false); assert.equal('responseType' in options, false);
    return new Response('%PDF actual bytes', { headers: { 'Content-Type': 'application/pdf' } });
  };
  const blob = await apiFetch('api/v1/reports/1/download/pdf', { responseType: 'blob', authRequired: true, signal: controller.signal });
  assert.equal(await blob.text(), '%PDF actual bytes');
});
test('download failures parse structured JSON and preserve persisted job IDs', async () => {
  globalThis.fetch = async () => Response.json({ message: 'Queue full', reportId: 44 }, { status: 503 });
  await assert.rejects(apiFetch('api/v1/reports', { responseType: 'blob', authRequired: true }), error => error.status === 503 && error.payload.reportId === 44);
});
test('legacy public GET fallback remains available for existing pages', async () => {
  let calls = 0;
  globalThis.fetch = async (_, options) => {
    if (++calls === 1) return Response.json({}, { status: 401 });
    assert.equal(options.headers.Authorization, undefined); return Response.json({ success: true });
  };
  assert.deepEqual(await apiFetch('api/v1/dashboard/stats'), { success: true }); assert.equal(calls, 2);
});
test('missing values and zero are distinct in tables and trend points', () => {
  assert.equal(number(null), '—'); assert.equal(number(undefined), '—'); assert.equal(number(0), '0');
  assert.deepEqual(trendPoints({ trend: [{ date: 'D-1', observation: null }, { date: 'D', observation: { value: 0 } }] }), [{ date: 'D-1', value: null }, { date: 'D', value: 0 }]);
});
test('delivery actions require reviewed enabled settings and explicit partial permission', () => {
  const configuration = { profileHash: 'reviewed', outboundEnabled: false, profile: { enabled: true, mode: 'CAPTURE', allowPartial: false } };
  assert.equal(canQueueMail({ status: 'READY' }, configuration), true);
  assert.equal(canQueueMail({ status: 'PARTIAL' }, configuration), false);
  assert.equal(canQueueMail({ status: 'BUILDING' }, configuration), false);
  assert.equal(canQueueMail({ status: 'READY' }, { ...configuration, profileHash: null }), false);
  configuration.profile.allowPartial = true; assert.equal(canQueueMail({ status: 'PARTIAL' }, configuration), true);
  configuration.profile.mode = 'SMTP'; assert.equal(canQueueMail({ status: 'READY' }, configuration), false);
  configuration.outboundEnabled = true; assert.equal(canQueueMail({ status: 'READY' }, configuration), true);
});
test('RCA presets accept both existing naming formats and pin report date mode', () => {
  const snake = { vendor: 'nokia', column_mapping: { Date: 'date' }, kpi_mapping: { PRB: 'prb' }, selected_kpis: ['PRB'], date_mode: 'single' };
  const camel = { vendor: 'nokia', columnMapping: { Date: 'date' }, kpiMapping: { PRB: 'prb' }, selectedKpis: ['PRB'] };
  assert.deepEqual(normalizeRcaPreset(snake), normalizeRcaPreset(camel)); assert.equal(normalizeRcaPreset(snake).dateMode, 'pre_post');
});
test('incomplete RCA mappings fail instead of guessing KPI definitions', () => {
  assert.throws(() => normalizeRcaPreset({ vendor: 'nokia', columnMapping: { Date: 'date' }, selectedKpis: ['PRB'] }), /mapped selected KPIs/);
});
