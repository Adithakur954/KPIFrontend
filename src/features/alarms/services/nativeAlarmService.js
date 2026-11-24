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

export async function fetchNativeAlarmCircles(company, signal) {
  const rows = [];
  let afterId = 0;
  for (let page = 0; page < 10; page++) {
    const response = await apiFetch(`api/v1/alarm-config/companies/${encodeURIComponent(company)}/circles`, {
      query: { afterId, limit: 200 }, authRequired: true, signal,
    });
    const items = response.data || [];
    if (!Array.isArray(items)) throw new Error("Circle configuration could not be read.");
    rows.push(...items);
    if (items.length < 200) return rows.filter(circle => circle.active);
    const next = Number(items.at(-1).id);
    if (!Number.isSafeInteger(next) || next <= afterId) throw new Error("Circle pagination changed; reload before saving.");
    afterId = next;
  }
  throw new Error("Too many configured circles; narrow the company configuration before editing.");
}

export async function captureOperationalInputs(company, body, signal) {
  const response = await apiFetch(`${workflow(company)}/operational-inputs`, { method: "POST", body, signal, authRequired: true });
  return response.data;
}

export async function fetchOperationalHistory(company, signal) {
  const response = await apiFetch(`${workflow(company)}/operational-inputs/history`, { query: { limit: 50 }, signal, authRequired: true });
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
