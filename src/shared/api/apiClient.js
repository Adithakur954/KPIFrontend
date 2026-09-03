// The Spring backend for this project runs on port 3001.
const DEFAULT_BASE_URL = "http://localhost:3001";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || DEFAULT_BASE_URL;

function buildUrl(endpoint, query) {
  const cleanBaseUrl = API_BASE_URL.replace(/\/+$/, "");
  const cleanEndpoint = String(endpoint || "").replace(/^\/+/, "");
  const url = new URL(`${cleanBaseUrl}/${cleanEndpoint}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

export async function apiFetch(
  endpoint,
  { query, body, headers = {}, ...options } = {},
) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const method = String(options.method || "GET").toUpperCase();
  const finalHeaders = { ...headers };
  const token =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  if (token && !finalHeaders.Authorization) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  if (!isFormData && body !== undefined && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const requestUrl = buildUrl(endpoint, query);

  const performRequest = async (requestHeaders) =>
    fetch(requestUrl, {
      ...options,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData || typeof body === "string"
            ? body
            : JSON.stringify(body),
    });

  const parseResponse = async (response) => {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    return { response, payload };
  };

  let { response, payload } = await parseResponse(
    await performRequest(finalHeaders),
  );

  if (response.status === 401 && token && method === "GET") {
    const retryHeaders = { ...headers };
    delete retryHeaders.Authorization;
    ({ response, payload } = await parseResponse(
      await performRequest(retryHeaders),
    ));
  }

  if (!response.ok) {
    const message = payload?.message || `API Error: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;

    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    throw error;
  }

  return payload;
}
