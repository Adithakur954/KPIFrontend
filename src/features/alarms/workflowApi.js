import { apiFetch } from "@/shared/api/apiClient";

export async function alarmRequest(company, path, options = {}, configuration = false) {
  const group = configuration ? "alarm-config" : "alarm-workflow";
  const result = await apiFetch(`api/v1/${group}/companies/${encodeURIComponent(company)}/${path}`, { authRequired: true, ...options });
  return result?.data ?? result;
}

export async function alarmDownload(company, path, filename) {
  const blob = await alarmRequest(company, path, { responseType: "blob" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readOutcome(run) {
  try { return typeof run?.result_json === "string" ? JSON.parse(run.result_json) : run?.result_json || {}; }
  catch { return {}; }
}

export function utcLabel(value) {
  if (!value) return "Not available";
  const raw = String(value);
  const date = new Date(/(?:z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw}Z`);
  return Number.isNaN(date.getTime()) ? "Not available" : `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}
