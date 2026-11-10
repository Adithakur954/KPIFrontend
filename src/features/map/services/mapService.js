import { apiFetch } from "@/shared/api/apiClient";
import { loadSitePages } from "../utils/mapData";

export async function getMapDetails(fileId, options = {}) {
  try {
    return await loadSitePages((id, page, limit, signal) => apiFetch("upload/site-data", {
      method: "GET",
      signal,
      query: {
        page,
        limit,
        fileId: id,
      },
    }), fileId, options);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return {
      success: false,
      message: error.message || "Failed to fetch map data",
      data: [],
    };
  }
}
