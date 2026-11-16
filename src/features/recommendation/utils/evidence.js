import { KPI_DEFAULTS } from "./recommendationUtils.js";

function evidenceText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(evidenceText).filter(Boolean).join("; ");
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
}

/** Parse the engine's display format; preserve unknown formats without guessing. */
export function evidenceForRow(row = {}) {
  const text = evidenceText(row.Evidence) || evidenceText(row["KPI Evidence"]);
  if (!text) return [];
  return text.split(/;\s*/).filter(Boolean).map(raw => {
    const match = raw.match(/^(.+):\s+(.+?)\s+vs median\s+(.+?)(?:\s+\(mean\s+(.+?)\))?(?:\s+\(limit\s+(.+?)\))?$/);
    return match
      ? { raw, metric: match[1], observed: match[2], median: match[3], mean: match[4] ?? null, limit: match[5] ?? null }
      : { raw };
  });
}

export function driversForRow(row = {}) {
  return evidenceText(row["Top KPI Drivers"]);
}


/** Use the scope-matched run configuration, never infer direction from observed values. */
export function targetForEvidence(item, config = {}) {
  if (!item.metric || item.limit === null || item.limit === undefined || String(item.limit).trim() === "") return null;
  const normalize = value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const label = normalize(item.metric);
  const match = Object.entries(config.kpis || {}).find(([key, value]) =>
    [key, value.friendly, KPI_DEFAULTS[key]?.friendly].some(name => name && normalize(name) === label));
  if (!match) return null;
  const settings = match[1];
  if (settings.threshold === null || settings.threshold === undefined || settings.threshold === "" ||
      !Number.isFinite(Number(settings.threshold)) || !Number.isFinite(Number(item.limit)) ||
      Number(settings.threshold) !== Number(item.limit)) return null;
  const operator = settings.direction === "high_good" ? "≥" : settings.direction === "low_good" ? "≤" : null;
  return operator ? { label: `${operator} ${item.limit}`, direction: settings.direction } : null;
}
