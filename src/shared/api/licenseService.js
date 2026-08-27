import { apiFetch, API_BASE_URL } from "@/shared/api/apiClient";

export async function fetchLicenses() {
  try {
    return await apiFetch("licenses", { method: "GET" });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to load licenses",
      data: [],
    };
  }
}

export async function createLicense(payload) {
  try {
    return await apiFetch("licenses", {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to create license",
      data: null,
    };
  }
}

export async function blockLicense(licenseId) {
  try {
    return await apiFetch(`licenses/${licenseId}/block`, {
      method: "PATCH",
    });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to block license",
      data: null,
    };
  }
}

export async function downloadLicenseFile(licenseId) {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null;

  const response = await fetch(`${baseUrl}/licenses/${licenseId}/download`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = `API Error: ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) message = payload.message;
    } catch {
      // Download failures may not return JSON.
    }
    throw new Error(message);
  }

  return response.blob();
}
