import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch } from './apiClient.js';

let previousFetch, previousWindow, previousStorage, values;
const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve=r; }); return { promise, resolve }; };
beforeEach(() => {
  previousFetch=globalThis.fetch;previousWindow=globalThis.window;previousStorage=globalThis.localStorage;
  values=new Map([['authToken','tenant-a']]);
  globalThis.localStorage={ getItem: key => values.get(key), removeItem: key => values.delete(key) };
  globalThis.window={ localStorage: globalThis.localStorage, dispatchEvent() {} };
});
afterEach(() => { globalThis.fetch=previousFetch;globalThis.window=previousWindow;globalThis.localStorage=previousStorage; });

test('identical overlapping API reads make one HTTP request; Refresh is fresh', async () => {
  const gate=deferred();let calls=0;
  globalThis.fetch=() => { calls++; return gate.promise; };
  const a=apiFetch('stats', {query:{fileId:1}}), b=apiFetch('stats', {query:{fileId:1}});
  await Promise.resolve();assert.equal(calls,1);
  gate.resolve(response({data:{value:1}}));
  const [first,second]=await Promise.all([a,b]);first.data.value=99;assert.equal(second.data.value,1);
  globalThis.fetch=async () => { calls++;return response({data:{value:2}}); };
  assert.equal((await apiFetch('stats',{query:{fileId:1}})).data.value,2);assert.equal(calls,2);
});

test('tokens, authentication policy and file scope cannot share responses', async () => {
  const calls=[];globalThis.fetch=async (url,options) => { calls.push([url,options.headers.Authorization]);return response({ok:true}); };
  const a=apiFetch('stats',{query:{fileId:1}});
  values.set('authToken','tenant-b');
  await Promise.all([a,apiFetch('stats',{query:{fileId:1}}),apiFetch('stats',{query:{fileId:1},authRequired:true}),apiFetch('stats',{query:{fileId:2}})]);
  assert.equal(calls.length,4);assert.equal(calls[0][1],'Bearer tenant-a');assert.equal(calls[1][1],'Bearer tenant-b');
});

test('mutation start and completion prevent joining reads from an earlier generation', async () => {
  const reads=[],write=deferred();
  globalThis.fetch=(_url,options) => {
    if(options.method==='POST') return write.promise;
    const gate=deferred();reads.push(gate);return gate.promise;
  };
  const old=apiFetch('stats');await Promise.resolve();
  const saving=apiFetch('settings',{method:'POST',body:{value:1}});
  const during=apiFetch('stats');await Promise.resolve();
  write.resolve(response({ok:true}));await saving;
  const fresh=apiFetch('stats');await Promise.resolve();
  assert.equal(reads.length,3);
  reads.forEach((gate,i) => gate.resolve(response({version:i})));
  assert.deepEqual((await Promise.all([old,during,fresh])).map(x=>x.version),[0,1,2]);
});

test('explicit no-store reads and binary exports are never combined', async () => {
  let calls=0;globalThis.fetch=async () => { calls++;return response({ok:true}); };
  await Promise.all([apiFetch('stats',{cache:'no-store'}),apiFetch('stats',{cache:'no-store'}),apiFetch('export',{responseType:'blob'}),apiFetch('export',{responseType:'blob'})]);
  assert.equal(calls,4);
});
