import { apiFetch } from "../../services/apiClient";

const ENDPOINT = "threshold-rules";

export async function fetchThresholdRules() {
  try {
    return await apiFetch(ENDPOINT, { method: "GET" });
  } catch (error) {
    console.error("[thresholdRuleService] fetchThresholdRules failed", error);
    return { success: false, message: error.message || "Failed to fetch threshold rules", data: [] };
  }
}

export async function createThresholdRule(payload) {
  try {
    return await apiFetch(ENDPOINT, { method: "POST", body: payload });
  } catch (error) {
    console.error("[thresholdRuleService] createThresholdRule failed", error);
    return { success: false, message: error.message || "Failed to create threshold rule" };
  }
}

export async function updateThresholdRule(id, payload) {
  try {
    return await apiFetch(`${ENDPOINT}/${id}`, { method: "PUT", body: payload });
  } catch (error) {
    console.error("[thresholdRuleService] updateThresholdRule failed", error);
    return { success: false, message: error.message || "Failed to update threshold rule" };
  }
}

export async function deleteThresholdRule(id) {
  try {
    return await apiFetch(`${ENDPOINT}/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("[thresholdRuleService] deleteThresholdRule failed", error);
    return { success: false, message: error.message || "Failed to delete threshold rule" };
  }
}

export async function evaluateThresholdRule({ metricName, value, technology }) {
  try {
    return await apiFetch(`${ENDPOINT}/evaluate`, {
      method: "GET",
      query: { metricName, value, technology },
    });
  } catch (error) {
    console.error("[thresholdRuleService] evaluateThresholdRule failed", error);
    return { success: false, message: error.message || "Failed to evaluate threshold" };
  }
}
