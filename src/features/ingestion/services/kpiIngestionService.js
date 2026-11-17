import { callBackendApi } from "@/shared/api/backendApiService";

function unwrap(response) {
  if (response?.success === false) {
    throw new Error(response.message || "KPI ingestion request failed.");
  }
  return response?.data ?? response;
}

export async function startKpiIngestion({ file, fileId, identityFields, sourceName, columnMapping }, signal) {
  const form = new FormData();
  form.append("file", file);
  form.append("fileId", String(fileId));
  form.append("identityFields", JSON.stringify(identityFields));
  form.append("sourceName", sourceName || "common");
  form.append("columnMapping", JSON.stringify(columnMapping || {}));
  return unwrap(await callBackendApi("API-106", { body: form, signal }));
}

export async function fetchKpiIngestionRuns(limit = 20, signal) {
  const result = unwrap(await callBackendApi("API-107", { query: { limit }, signal }));
  return Array.isArray(result) ? result : result?.items || [];
}

export async function fetchKpiIngestionRun(id, signal) {
  return unwrap(await callBackendApi("API-108", { pathParams: { id }, signal }));
}

export async function retryKpiIngestionRun(id, signal) {
  return unwrap(await callBackendApi("API-109", { pathParams: { id }, signal }));
}
