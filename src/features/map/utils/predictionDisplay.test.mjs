import test from 'node:test';
import assert from 'node:assert/strict';
import { findPredictionSite, predictionEvidence } from './predictionDisplay.mjs';

test('maps only the exact source site or cell; never a target or partial name', () => {
  const sites = [{ SITEID: 'RMS401', cells: [{ Cell_Name: 'RMS401_L18_A' }] }];
  assert.equal(findPredictionSite({ site: 'rms401' }, sites), sites[0]);
  assert.equal(findPredictionSite({ cellName: 'rms401_l18_a' }, sites), sites[0]);
  assert.equal(findPredictionSite({ site: 'RMS4012', targetCell: 'RMS401_L18_A' }, sites), null);
  assert.equal(findPredictionSite({ cellName: 'RMS401_L21_A' }, sites), null);
});
test('preserves explanations and does not invent evidence', () => {
  assert.deepEqual(predictionEvidence({ reasons: ['rule'], evidence: ['PRB 90%'] }), { reasons: ['rule'], evidence: ['PRB 90%'] });
  assert.deepEqual(predictionEvidence({}), { reasons: [], evidence: [] });
});
