import { apiFetch } from "@/shared/api/apiClient";

export async function fetchLocalLicenseStatus() {
  try {
    return await apiFetch("local-license/status", { method: "GET" });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to load license status",
      data: null,
    };
  }
}

export async function fetchDeviceId() {
  try {
    return await apiFetch("local-license/device-id", { method: "GET" });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to load device id",
      data: null,
    };
  }
}

export async function uploadLocalLicense(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    return await apiFetch("local-license/upload", {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to upload license",
      data: null,
    };
  }
}
