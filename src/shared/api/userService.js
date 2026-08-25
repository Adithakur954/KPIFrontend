import { apiFetch } from "@/shared/api/apiClient";

export async function fetchUsers() {
  try {
    return await apiFetch("users", {
      method: "GET",
    });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to load users",
      data: [],
    };
  }
}

export async function createUserAccount(payload) {
  try {
    return await apiFetch("users", {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to create account",
      data: null,
    };
  }
}
