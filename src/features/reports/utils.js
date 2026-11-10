export const activeStatuses = new Set(["QUEUED", "BUILDING", "PREPARING", "SENDING"]);
export const readyStatuses = new Set(["READY", "PARTIAL"]);
export function number(value) { return value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 }); }
export function trendPoints(item) { return (item?.trend || []).map(point => ({ date: point.date, value: point.observation?.value ?? null })); }
export function canQueueMail(report, configuration) {
  const profile = configuration?.profile;
  return readyStatuses.has(report?.status) && !!configuration?.profileHash && !!profile?.enabled && (report.status !== "PARTIAL" || profile.allowPartial) && (profile.mode === "CAPTURE" || configuration.outboundEnabled === true);
}
export function normalizeRcaPreset(config = {}) {
  const columnMapping = config.columnMapping ?? config.column_mapping ?? {};
  const kpiMapping = config.kpiMapping ?? config.kpi_mapping ?? {};
  const selectedKpis = config.selectedKpis ?? config.selected_kpis ?? [];
  if (!config.vendor || !Object.keys(columnMapping).length || !selectedKpis.length || selectedKpis.some(key => !kpiMapping[key])) throw new Error("This preset needs a vendor, column mappings and mapped selected KPIs. Review it in RCA Recommendation before using it in a report.");
  return { vendor: config.vendor, columnMapping, kpiMapping, selectedKpis, kpis: config.kpis || {},
    rcaThresholds: config.rcaThresholds ?? config.rca_thresholds ?? {}, severityThresholds: config.severityThresholds ?? config.severity_thresholds ?? {},
    anomalyThresholds: config.anomalyThresholds ?? config.anomaly_thresholds ?? {}, dateMode: "pre_post" };
}
