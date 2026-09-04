import { apiFetch } from "@/shared/api/apiClient";

export async function fetchBackendHealth() {
  return apiFetch("health");
}
