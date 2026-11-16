import test from "node:test";
import assert from "node:assert/strict";
import { evidenceForRow, driversForRow, targetForEvidence } from "./evidence.js";

test("engine Evidence preserves observed zero, negative values and optional limits", () => {
  const rows = evidenceForRow({ Evidence: "Packet Loss (%): 0.00 vs median 0.20 (limit 0.50); SINR (dB): -3.50 vs median 7.00" });
  assert.deepEqual(rows.map(({ metric, observed, median, limit }) => ({ metric, observed, median, limit })), [
    { metric: "Packet Loss (%)", observed: "0.00", median: "0.20", limit: "0.50" },
    { metric: "SINR (dB)", observed: "-3.50", median: "7.00", limit: null },
  ]);
});
test("targets use configured direction, actual evidence limit and engine-friendly labels", () => {
  const config = { kpis: {
    "RRC Setup Success Rate": { threshold: 99.1, direction: "high_good" },
    "MV_Packet Loss UL": { threshold: 0, direction: "low_good" },
  } };
  assert.equal(targetForEvidence({ metric: "RRC Setup SR (%)", limit: "99.10" }, config).label, "≥ 99.10");
  assert.equal(targetForEvidence({ metric: "Packet Loss UL (%)", limit: "0.00" }, config).label, "≤ 0.00");
  assert.equal(targetForEvidence({ metric: "RRC Setup SR (%)", limit: "98.00" }, config), null);
  assert.equal(targetForEvidence({ metric: "Unknown KPI", limit: "98.00" }, config), null);
  assert.equal(targetForEvidence({ metric: "RRC Setup SR (%)", limit: null }, config), null);
});
test("period means parse separately from medians and legacy evidence does not invent a mean", () => {
  const [row] = evidenceForRow({ Evidence: "SINR (dB): -3.00 vs median 6.00 (mean 0.00) (limit 5.00)" });
  assert.equal(row.mean, "0.00");
  assert.equal(row.median, "6.00");
  assert.equal(row.limit, "5.00");
  const [legacy] = evidenceForRow({ Evidence: "SINR (dB): -3.00 vs median 6.00 (limit 5.00)" });
  assert.equal(legacy.mean, null);
  assert.equal(legacy.median, "6.00");
  assert.equal(legacy.limit, "5.00");
});
test("legacy evidence key and unknown display formats remain readable without guessed metrics", () => {
  assert.equal(evidenceForRow({ Evidence: "", "KPI Evidence": "Source supplied narrative" })[0].raw, "Source supplied narrative");
  assert.equal(evidenceForRow({ Evidence: "Source supplied narrative" })[0].metric, undefined);
  assert.deepEqual(evidenceForRow({ Evidence: null }), []);
  assert.equal(driversForRow({ "Top KPI Drivers": 0 }), "0");
});
