# Backend API integration

`backendApiCatalog.json` contains the 186 canonical method and URL pairs from the Backend API Handbook. Use `callBackendApi` to call an operation by its handbook ID. This keeps API paths centralized and routes requests through the shared authentication, cancellation, query encoding, and response handling in `apiClient.js`.

```js
import { callBackendApi } from "@/shared/api/backendApiService";

const result = await callBackendApi("API-079", {
  query: { fileId: 500 },
  signal,
});

const zone = await callBackendApi("API-002", {
  pathParams: { companyId: 100 },
  body: { code: "WEST", name: "West", active: true },
});
```

Supply `pathParams` for every `{placeholder}` in a URL. Pass query values through `query`; use a `FormData` body for multipart uploads and `responseType: "blob"` for downloads. Login, registration, and health checks default to public requests; other operations require an authenticated session. Pass `authRequired` explicitly only when a documented flow needs a different behavior.

The catalog covers backend operations, while existing feature services and pages provide the user workflows. An endpoint's presence in the handbook or catalog does not mean the backend's runtime configuration, license, role, or tenant permissions will allow every request.
