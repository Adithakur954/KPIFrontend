import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateChartRows } from './chartData.js';

test('chart means exclude missing/nonfinite observations and retain zero', () => {
  const result=aggregateChartRows([{cell:'A',site:'SITE',value:100},{cell:'A',value:null},{cell:'A',value:''},{cell:'A',value:0},{cell:'A',value:Infinity},{cell:'MISSING',value:undefined}],'cell');
  assert.equal(result.length,1);assert.equal(result[0].value,50);assert.equal(result[0].count,2);assert.equal(result[0].site,'SITE');
});

test('chart aggregation supports numeric zero and prototype-like dimension labels without retaining row arrays', () => {
  const result=aggregateChartRows([{cell:0,value:0},{cell:'__proto__',value:5},{cell:'constructor',value:10}],'cell');
  assert.deepEqual(result.map(row=>row.cell),['0','__proto__','constructor']);
  assert.ok(result.every(row=>row.items===undefined));
});
