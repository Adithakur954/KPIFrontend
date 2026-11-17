import { apiFetch } from "@/shared/api/apiClient";

const workflow = company => `api/v1/alarm-workflow/companies/${encodeURIComponent(company)}`;

export async function fetchNativeAlarmSummary(company, asOf, signal) {
  const response = await apiFetch(`${workflow(company)}/dashboard`, { query: { asOf }, authRequired: true, signal });
  return response.data;
}

export async function fetchAlarmCompanies(signal) {
  const response = await apiFetch("api/v1/companies", { authRequired: true, signal });
  return response.data || [];
}

export async function downloadNativeAlarmReport(company, asOf, circleId, format) {
  const blob = await apiFetch(`${workflow(company)}/dashboard/report/${format}`, {
    query: { asOf, circleId }, authRequired: true, responseType: "blob",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `alarm-${circleId ? `circle-${circleId}` : "national"}-${asOf.slice(0, 10)}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
