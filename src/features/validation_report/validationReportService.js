import { apiFetch } from "../../services/apiClient";

export async function fetchValidationReport(fileId) {
  try {
    return await apiFetch(`kpi/validation-report/${fileId}`, { method: "GET" });
  } catch (error) {
    console.error("[validationReportService] fetchValidationReport failed", error);
    return { success: false, message: error.message || "Failed to fetch validation report", data: null };
  }
}

export async function fetchDynamicMetrics(fileId) {
  try {
    return await apiFetch("kpi/dynamic/metrics", {
      method: "GET",
      query: { fileId },
    });
  } catch (error) {
    console.error("[validationReportService] fetchDynamicMetrics failed", error);
    return { success: false, message: error.message || "Failed to fetch KPI metrics", metrics: [] };
  }
}

export async function fetchWorstCells({ fileId, metric, limit = 10 }) {
  try {
    return await apiFetch("kpi/worst-cells", {
      method: "GET",
      query: { fileId, metric, limit },
    });
  } catch (error) {
    console.error("[validationReportService] fetchWorstCells failed", error);
    return { success: false, message: error.message || "Failed to fetch worst cells", data: null };
  }
}

export async function fetchWorstSites({ fileId, metric, limit = 10 }) {
  try {
    return await apiFetch("kpi/worst-sites", {
      method: "GET",
      query: { fileId, metric, limit },
    });
  } catch (error) {
    console.error("[validationReportService] fetchWorstSites failed", error);
    return { success: false, message: error.message || "Failed to fetch worst sites", data: null };
  }
}

export async function fetchWorstCellDetail({ fileId, cellName, metric }) {
  try {
    return await apiFetch("kpi/worst-cells/detail", {
      method: "GET",
      query: { fileId, cellName, metric },
    });
  } catch (error) {
    console.error("[validationReportService] fetchWorstCellDetail failed", error);
    return { success: false, message: error.message || "Failed to fetch worst cell detail", data: null };
  }
}
