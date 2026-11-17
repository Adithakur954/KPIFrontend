import { callBackendApi } from "@/shared/api/backendApiService";

export async function fetchBackendHealth() {
  return callBackendApi("API-069");
}
