import { apiFetch } from "@/shared/api/apiClient";

export async function getMapDetails(fileId, options = {}) {
  try {
    return await apiFetch("upload/site-data", {
      method: "GET",
      signal: options.signal,
      query: {
        page: 1,
        limit: 10000,
        ...(fileId ? { fileId } : {}),
      },
    });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to fetch map data",
      data: [],
    };
  }
}
