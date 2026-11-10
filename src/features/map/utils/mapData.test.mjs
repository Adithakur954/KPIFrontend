import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validCoordinates, loadSitePages, createNearbySiteIndex } from './mapData.js';

test('coordinates reject missing, nonnumeric and out-of-range locations while keeping zero', () => {
  assert.equal(validCoordinates(0, 0), true);
  for (const pair of [[null,0],[0,undefined],['28',77],[NaN,77],[91,77],[28,181]]) assert.equal(validCoordinates(...pair), false);
});

test('site loader collects all pages and preserves row order', async () => {
  const calls=[];
  const result=await loadSitePages(async (file,page,limit) => {
    calls.push([file,page,limit]);
    return { success:true, data:page===1 ? [{id:1},{id:2}] : [{id:3}], pagination:{totalCount:3,hasNextPage:page===1} };
  }, 42, { pageSize:2 });
  assert.deepEqual(result.data.map(row=>row.id),[1,2,3]);
  assert.deepEqual(calls,[[42,1,2],[42,2,2]]);
});

test('incomplete, oversized and changing pagination fail instead of silently plotting partial data', async () => {
  await assert.rejects(loadSitePages(async()=>({success:true,data:[{}],pagination:{totalCount:2,hasNextPage:false}}),1), /completely/);
  await assert.rejects(loadSitePages(async()=>({success:true,data:[{}],pagination:{totalCount:100001,hasNextPage:true}}),1), /limit/);
  await assert.rejects(loadSitePages(async(_,page)=>({success:true,data:[{}],pagination:{totalCount:page===1?2:3,hasNextPage:page===1}}),1), /changed/);
  await assert.rejects(loadSitePages(async()=>({success:true,data:[],pagination:{hasNextPage:true}}),1), /empty intermediate/);
});

test('failed or cancelled later pages never publish a partial site upload', async () => {
  const controller=new AbortController();
  await assert.rejects(loadSitePages(async()=>{controller.abort();return {success:true,data:[{}]};},1,{signal:controller.signal}),{name:'AbortError'});
  await assert.rejects(loadSitePages(async(_,page)=>page===1?{success:true,data:[{}],pagination:{hasNextPage:true}}:{success:false,message:'Database unavailable'},1),/Database unavailable/);
});

function distance(a,b) {
  const rad=Math.PI/180;
  const h=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lon-a.lon)*rad/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

test('spatial candidates retain every exact neighbour, including dateline and polar cases', () => {
  let seed=42;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  const sites=Array.from({length:1200},(_,id)=>({id,lat:28+random(),lon:77+random()}));
  sites.push({id:1200,lat:0,lon:179.99},{id:1201,lat:0,lon:-179.99},{id:1202,lat:89.99,lon:0},{id:1203,lat:89.99,lon:179});
  const near=createNearbySiteIndex(sites);
  let testedCandidates=0;
  for (const source of sites) {
    const candidates=near(source);testedCandidates+=candidates.length;
    assert.deepEqual(candidates.filter(site=>distance(source,site)<=8).map(site=>site.id),sites.filter(site=>distance(source,site)<=8).map(site=>site.id));
  }
  assert.ok(testedCandidates<sites.length**2/4,`Index should substantially reduce pair checks: ${testedCandidates}`);
});
