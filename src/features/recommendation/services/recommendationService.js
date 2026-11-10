import { apiFetch } from "@/shared/api/apiClient";
import { asyncWait } from "@/shared/api/asyncWait";

export async function runRecommendation(fileId, payload = {}) {
  try {
    return await apiFetch("kpi/recommendation/run", {
      method: "POST",
      query: { fileId },
      body: payload,
    });
  } catch (error) {
    console.error("[recommendationService] runRecommendation failed", {
      fileId,
      payload,
      message: error?.message,
    });
    throw error;
  }
}

export async function startRecommendationJob(fileId, payload = {}, { signal } = {}) {
  try {
    return await apiFetch("kpi/recommendation/jobs", {
      method: "POST",
      query: { fileId },
      body: payload,
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    console.error("[recommendationService] startRecommendationJob failed", {
      fileId,
      payload,
      message: error?.message,
    });
    throw error;
  }
}

export async function fetchRecommendationJob(jobId, { signal } = {}) {
  try {
    return await apiFetch(`kpi/recommendation/jobs/${encodeURIComponent(jobId)}`, {
      method: "GET",
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    console.error("[recommendationService] fetchRecommendationJob failed", {
      jobId,
      message: error?.message,
    });
    throw error;
  }
}

export async function fetchRecommendationPresets() {
  try {
    return await apiFetch("kpi/recommendation/presets", {
      method: "GET",
    });
  } catch (error) {
    console.error("[recommendationService] fetchRecommendationPresets failed", {
      message: error?.message,
    });
    throw error;
  }
}

export async function saveRecommendationPreset(name, config) {
  try {
    return await apiFetch("kpi/recommendation/presets", {
      method: "POST",
      body: { name, config },
    });
  } catch (error) {
    console.error("[recommendationService] saveRecommendationPreset failed", {
      name,
      message: error?.message,
    });
    throw error;
  }
}

export async function loadRecommendationPreset(name) {
  try {
    return await apiFetch(`kpi/recommendation/presets/${encodeURIComponent(name)}`, {
      method: "GET",
    });
  } catch (error) {
    console.error("[recommendationService] loadRecommendationPreset failed", {
      name,
      message: error?.message,
    });
    throw error;
  }
}

export async function downloadRecommendationExport(fileId, payload = {}, { signal, onProgress } = {}) {
  const started = await apiFetch("api/v1/rca-exports", { method: "POST", query: { fileId }, body: payload, signal, authRequired: true });
  let job = started?.data;
  if (!job?.id) throw new Error("Export job did not start.");
  for (let attempt = 0; attempt < 1200; attempt++) {
    onProgress?.(job);
    if (job.status === "FAILED") throw new Error(job.message || "RCA export failed.");
    if (job.status === "COMPLETED") {
      onProgress?.({ ...job, message: "Export ready. Downloading saved workbook..." });
      const blob = await apiFetch(`api/v1/rca-exports/${job.id}/download`, { signal, authRequired: true, responseType: "blob" });
      return { blob, fileName: `rca_recommendation_${fileId}_${job.id}.xlsx` };
    }
    await asyncWait(1000, signal);
    const next = await apiFetch(`api/v1/rca-exports/${job.id}`, { signal, authRequired: true });
    job = next?.data || job;
  }
  throw new Error(`Export job #${job.id} is still processing. Click Export again with the same settings to resume checking it.`);
}
