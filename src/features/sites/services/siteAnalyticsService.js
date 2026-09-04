import { apiFetch } from "@/shared/api/apiClient";

export async function fetchSiteSummary(fileId) {
  try {
    return await apiFetch("sites/summary", {
      method: "GET",
      query: { fileId },
    });
  } catch (error) {
    console.error("[siteAnalyticsService] fetchSiteSummary failed", error);
    return {
      success: false,
      message: error.message || "Failed to fetch site summary",
      data: null,
    };
  }
}

export async function fetchWorstSites(fileId, limit = 10) {
  try {
    return await apiFetch("sites/worst", {
      method: "GET",
      query: { fileId, limit },
    });
  } catch (error) {
    console.error("[siteAnalyticsService] fetchWorstSites failed", error);
    return {
      success: false,
      message: error.message || "Failed to fetch worst sites",
      data: null,
    };
  }
}

export async function fetchSiteDetails(fileId, site) {
  try {
    return await apiFetch("sites/details", {
      method: "GET",
      query: { fileId, site },
    });
  } catch (error) {
    console.error("[siteAnalyticsService] fetchSiteDetails failed", error);
    return {
      success: false,
      message: error.message || "Failed to fetch site details",
      data: null,
    };
  }
}

export async function fetchSiteIntelligence(fileId, siteFileId, limit = 20) {
  try {
    return await apiFetch("sites/intelligence", {
      method: "GET",
      query: {
        fileId: fileId || undefined,
        siteFileId: siteFileId || undefined,
        limit,
      },
    });
  } catch (error) {
    console.error("[siteAnalyticsService] fetchSiteIntelligence failed", error);
    return {
      success: false,
      message: error.message || "Failed to fetch site intelligence",
      data: null,
    };
  }
}

export async function fetchSitePredictionSummary(fileId) {
  try {
    return await apiFetch("site-prediction/summary", {
      method: "GET",
      query: { fileId },
    });
  } catch (error) {
    console.error("[siteAnalyticsService] fetchSitePredictionSummary failed", error);
    return {
      success: false,
      message: error.message || "Failed to fetch site prediction summary",
      data: null,
    };
  }
}

export async function fetchSitePredictionRecommendations({ fileId, site, limit = 50 }) {
  try {
    return await apiFetch("site-prediction/recommendations", {
      method: "GET",
      query: { fileId, site, limit },
    });
  } catch (error) {
    console.error("[siteAnalyticsService] fetchSitePredictionRecommendations failed", error);
    return {
      success: false,
      message: error.message || "Failed to fetch site prediction recommendations",
      data: null,
    };
  }
}

export async function runLbWcfPrediction({ fileId, taFile, method = "both", quantile = 0.1, mlMode = 3 }) {
  try {
    const body = new FormData();
    body.append("method", method);
    body.append("quantile", String(quantile));
    body.append("mlMode", String(mlMode));
    if (taFile) {
      body.append("taFile", taFile);
    }

    return await apiFetch("site-prediction/lb-wcf", {
      method: "POST",
      query: { fileId },
      body,
    });
  } catch (error) {
    console.error("[siteAnalyticsService] runLbWcfPrediction failed", error);
    return {
      success: false,
      message: error.message || "Failed to run LB prediction",
      data: null,
    };
  }
}
