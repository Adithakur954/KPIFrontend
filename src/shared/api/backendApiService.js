import apiCatalog from "./backendApiCatalog.json";
import { apiFetch } from "./apiClient";

const operationsById = new Map(apiCatalog.map((operation) => [operation.id, operation]));
const publicOperationIds = new Set(["040", "041", "069"]);

export const backendApiOperations = apiCatalog;

/** Return the handbook entry for an API ID (for example, "API-001" or "001"). */
export function getBackendApi(operationId) {
  const id = String(operationId).replace(/^API-/, "").padStart(3, "0");
  const operation = operationsById.get(id);
  if (!operation) throw new Error(`Unknown backend API operation: ${operationId}`);
  return operation;
}

/**
 * Call any canonical operation in Backend_API_Handbook.docx.
 * Path placeholders are supplied with pathParams; query, body, headers, signal,
 * responseType and other fetch options are passed to the shared API client.
 */
export function callBackendApi(operationId, request = {}) {
  const operation = getBackendApi(operationId);
  const { pathParams = {}, authRequired, ...options } = request;
  const path = operation.path.replace(/\{([^}]+)\}/g, (_match, key) => {
    const value = pathParams[key];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Missing path parameter "${key}" for API-${operation.id}`);
    }
    return encodeURIComponent(String(value));
  });

  return apiFetch(path, {
    ...options,
    method: operation.method,
    authRequired: authRequired ?? !publicOperationIds.has(operation.id),
  });
}
