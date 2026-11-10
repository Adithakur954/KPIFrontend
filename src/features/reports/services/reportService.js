import { apiFetch } from "@/shared/api/apiClient";

async function request(path, options = {}) {
  const result = await apiFetch(`api/v1/${path}`, { ...options, authRequired: true });
  if (result?.success === false) throw new Error(result.message || "Report request failed.");
  return result?.data ?? result;
}
export const reportService = {
  nightlyProfile: (fileId, signal) => request("nightly/profile", { query: { fileId }, signal }),
  saveNightlyProfile: (fileId, body, signal) => request("nightly/profile", { method: "PUT", query: { fileId }, body, signal }),
  nightlyRuns: (fileId, signal) => request("nightly/runs", { query: { fileId, limit: 50 }, signal }),
  nightlyRun: (id, signal) => request(`nightly/runs/${id}`, { signal }),
  startNightly: (fileId, date, allowLate, signal) => request("nightly/runs", { method: "POST", query: { fileId, date, allowLate }, signal }),
  retryNightly: (id, rediscoverInput, refreshMailProfile, signal) => request(`nightly/runs/${id}/retry`, { method: "POST", query: { rediscoverInput, refreshMailProfile }, signal }),
  datasets: (page, signal) => request("report-datasets", { query: { page, limit: 50 }, signal }),
  snapshots: (fileId, signal) => request("daily-analysis/snapshots", { query: { fileId, limit: 50 }, signal }),
  profile: (fileId, signal) => request("daily-analysis/profile", { query: { fileId }, signal }),
  saveProfile: (fileId, body, signal) => request("daily-analysis/profile", { method: "PUT", query: { fileId }, body, signal }),
  buildAnalysis: (fileId, date, signal) => request("daily-analysis/snapshots", { method: "POST", query: { fileId, date }, signal }),
  retryAnalysis: (id, signal) => request(`daily-analysis/snapshots/${id}/retry`, { method: "POST", signal }),
  comparisons: (id, page, signal) => request(`daily-analysis/snapshots/${id}/comparisons`, { query: { page, limit: 10 }, signal }),
  reports: (fileId, signal) => request("reports", { query: { fileId, limit: 50 }, signal }),
  buildReport: (snapshotId, modules, rcaConfig, signal) => request("reports", { method: "POST", query: { snapshotId }, body: { modules: rcaConfig ? [...modules, "rca"] : modules, rcaConfig: rcaConfig || {} }, signal }),
  rcaPresets: signal => request("kpi/recommendation/presets", { signal }),
  rcaPreset: (name, signal) => request(`kpi/recommendation/presets/${encodeURIComponent(name)}`, { signal }),
  retryReport: (id, signal) => request(`reports/${id}/retry`, { method: "POST", signal }),
  deliveries: (fileId, signal) => request("report-mail/deliveries", { query: { fileId, limit: 50 }, signal }),
  delivery: (id, signal) => request(`report-mail/deliveries/${id}`, { signal }),
  mailProfile: (fileId, signal) => request("report-mail/profile", { query: { fileId }, signal }),
  saveMailProfile: (fileId, body, signal) => request("report-mail/profile", { method: "PUT", query: { fileId }, body, signal }),
  queueMail: (reportId, expectedProfileHash, signal) => request("report-mail/deliveries", { method: "POST", query: { reportId, expectedProfileHash }, signal }),
  mailAction: (id, action, body, signal) => request(`report-mail/deliveries/${id}/${action}`, { method: "POST", body, signal }),
  columns: (fileId, signal) => request("kpi/dynamic/columns", { query: { fileId }, signal }),
};

export async function downloadReportFile(id, format, signal, captured = false) {
  const path = captured ? `report-mail/deliveries/${id}/message.eml` : `reports/${id}/download/${format}`;
  const blob = await apiFetch(`api/v1/${path}`, { authRequired: true, responseType: "blob", signal });
  if (signal?.aborted) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url;
  anchor.download = captured ? `report-mail-${id}.eml` : `common-report-${id}.${format === "configuration" ? "configuration.json" : format}`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
