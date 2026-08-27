import { apiFetch } from "@/shared/api/apiClient";

export async function fetchCompanies() {
  try {
    return await apiFetch("companies", { method: "GET" });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to load companies",
      data: [],
    };
  }
}

export async function createCompany(payload) {
  try {
    return await apiFetch("companies", {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to create company",
      data: null,
    };
  }
}

export async function activateCompany(companyId) {
  try {
    return await apiFetch(`companies/${companyId}/activate`, {
      method: "PATCH",
    });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to activate company",
      data: null,
    };
  }
}

export async function blockCompany(companyId) {
  try {
    return await apiFetch(`companies/${companyId}/block`, {
      method: "PATCH",
    });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to block company",
      data: null,
    };
  }
}
