import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('./worstCell.worker.js',import.meta.url),'utf8');
function analyze(payload){
  let response;const self={postMessage:message=>{response=message;}};
  vm.runInNewContext(source,{self});self.onmessage({data:{type:'analyzeMetric',id:1,payload}});
  assert.equal(response.error,undefined);return JSON.parse(JSON.stringify(response.result));
}

test('actual threshold worker excludes missing/nonfinite samples and preserves real zero', () => {
  const result=analyze({mode:'threshold',metricKey:'rrc',metricLabel:'RRC',dimensionKey:'cellName',activeRange:{},thresholdContext:{thresholdKey:'rrc',thresholdValue:90,thresholdOperator:'>='},rows:[
    {cellName:'A',value:100},{cellName:'A',value:null},{cellName:'A',value:''},{cellName:'A',value:Infinity},
    {cellName:'B',value:0},{cellName:'MISSING',value:null},{cellName:'MISSING',value:' '},{cellName:'MISSING',value:false},
  ]});
  assert.equal(result.comparedDimensions,2);assert.equal(result.passCount,1);assert.equal(result.failCount,1);
  assert.equal(result.failedDimensions[0].value,'B');assert.equal(result.failedDimensions[0].avgValue,0);
});

test('pre/post worker compares only observed values and keeps the true sample count', () => {
  const result=analyze({mode:'pre_post',metricKey:'rrc',dimensionKey:'cellName',operator:'>=',preRange:{start:'2026-11-08',end:'2026-11-08'},postRange:{start:'2026-11-09',end:'2026-11-09'},rows:[
    {cellName:'A',date:'2026-11-08',value:100},{cellName:'A',date:'2026-11-08',value:null},
    {cellName:'A',date:'2026-11-09',value:80},{cellName:'ONLY_PRE',date:'2026-11-08',value:90},{cellName:'ONLY_PRE',date:'2026-11-09',value:null},
  ]});
  assert.equal(result.comparedDimensions,1);assert.equal(result.failCount,1);
  assert.equal(result.failedDimensions[0].preValue,100);assert.equal(result.failedDimensions[0].postValue,80);assert.equal(result.failedDimensions[0].preCount,1);
});
