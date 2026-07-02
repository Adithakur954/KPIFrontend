import { apiFetch, API_BASE_URL } from "../../../services/apiClient";

const ENDPOINTS = {
  KPI_UPLOAD: import.meta.env.VITE_UPLOAD_KPI_ENDPOINT || "upload/kpi",
  KPI_PREVIEW: import.meta.env.VITE_UPLOAD_KPI_PREVIEW_ENDPOINT || "upload/kpi/preview",
  UPLOAD_JOB: import.meta.env.VITE_UPLOAD_JOB_ENDPOINT || "upload/jobs",
  SITE_UPLOAD: import.meta.env.VITE_UPLOAD_SITE_ENDPOINT || "upload/site",
  HISTORY: import.meta.env.VITE_UPLOAD_HISTORY_ENDPOINT || "upload/uploads/history",
  DELETE_UPLOAD: import.meta.env.VITE_UPLOAD_DELETE_ENDPOINT || "upload/uploads",
};

function createUploadFormData(file, uploadedBy, remarks, options = {}) {
  const formData = new FormData();
  formData.append("file", file);

  if (uploadedBy) {
    formData.append("uploadedBy", uploadedBy);
  }

  if (remarks) {
    formData.append("remarks", remarks);
  }

  if (options.appendOption) {
    formData.append("appendOption", options.appendOption);
  }

  if (options.columnMapping && Object.keys(options.columnMapping).length > 0) {
    formData.append("columnMapping", JSON.stringify(options.columnMapping));
  }

  if (options.cleanKpiData !== undefined) {
    formData.append("cleanKpiData", String(Boolean(options.cleanKpiData)));
  }

  const targetFileId = options.fileId || options.targetFileId;
  if (targetFileId) {
    formData.append("fileId", targetFileId);
  }

  return formData;
}

export async function uploadKpisFile(file, uploadedBy, remarks, options) {
  return uploadKpisFileWithProgress(file, uploadedBy, remarks, options);
}

export async function previewKpisFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    return await apiFetch(ENDPOINTS.KPI_PREVIEW, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    console.error("[uploadService] previewKpisFile failed", {
      fileName: file?.name,
      message: error?.message,
    });
    return {
      success: false,
      message: error.message || "KPI preview failed",
      data: null,
    };
  }
}

export async function uploadKpisFileWithProgress(
  file,
  uploadedBy,
  remarks,
  optionsOrProgress,
  maybeOnProgress,
) {
  const options =
    typeof optionsOrProgress === "function" || optionsOrProgress == null
      ? {}
      : optionsOrProgress;
  const onProgress =
    typeof optionsOrProgress === "function" ? optionsOrProgress : maybeOnProgress;
  const formData = createUploadFormData(file, uploadedBy, remarks, options);
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const endpoint = ENDPOINTS.KPI_UPLOAD.replace(/^\/+/, "");
  const url = `${baseUrl}/${endpoint}`;
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("authToken") : null;

  try {
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || typeof onProgress !== "function") return;
        const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
        onProgress(percent);
      };

      xhr.onload = () => {
        let payload = null;
        try {
          payload = JSON.parse(xhr.responseText || "{}");
        } catch {
          payload = null;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload || { success: true, message: "Upload processed successfully." });
          return;
        }

        if (xhr.status === 401 && typeof window !== "undefined") {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          window.dispatchEvent(new Event("auth:unauthorized"));
        }

        reject(new Error(payload?.message || `API Error: ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.send(formData);
    });

    if (typeof onProgress === "function") onProgress(100);
    return result;
  } catch (error) {
    console.error("[uploadService] uploadKpisFileWithProgress failed", {
      fileName: file?.name,
      uploadedBy,
      remarks,
      options,
      message: error?.message,
    });
    return {
      success: false,
      message: error.message || "KPI upload failed",
      data: null,
    };
  }
}

export async function uploadSitesFile(file, uploadedBy, remarks) {
  try {
    return await apiFetch(ENDPOINTS.SITE_UPLOAD, {
      method: "POST",
      body: createUploadFormData(file, uploadedBy, remarks),
    });
  } catch (error) {
    console.error("[uploadService] uploadSitesFile failed", {
      fileName: file?.name,
      uploadedBy,
      remarks,
      message: error?.message,
    });
    return {
      success: false,
      message: error.message || "Site upload failed",
      data: null,
    };
  }
}

export async function fetchUploadJob(jobId) {
  try {
    return await apiFetch(`${ENDPOINTS.UPLOAD_JOB}/${jobId}`, { method: "GET" });
  } catch (error) {
    console.error("[uploadService] fetchUploadJob failed", {
      jobId,
      message: error?.message,
    });
    return {
      success: false,
      message: error.message || "Failed to fetch upload job",
      data: null,
    };
  }
}

export async function fetchUploadJobs(limit = 10) {
  try {
    return await apiFetch(ENDPOINTS.UPLOAD_JOB, {
      method: "GET",
      query: { limit },
    });
  } catch (error) {
    console.error("[uploadService] fetchUploadJobs failed", {
      message: error?.message,
    });
    return {
      success: false,
      message: error.message || "Failed to fetch upload jobs",
      data: [],
    };
  }
}

export async function retryUploadJob(jobId) {
  try {
    return await apiFetch(`${ENDPOINTS.UPLOAD_JOB}/${jobId}/retry`, {
      method: "POST",
    });
  } catch (error) {
    console.error("[uploadService] retryUploadJob failed", {
      jobId,
      message: error?.message,
    });
    return {
      success: false,
      message: error.message || "Failed to retry upload job",
      data: null,
    };
  }
}

export async function fetchUploads() {
  try {
    return await apiFetch(ENDPOINTS.HISTORY, { method: "GET" });
  } catch (error) {
    console.error("[uploadService] fetchUploads failed", {
      message: error?.message,
    });
    return {
      success: false,
      message: error.message || "Failed to fetch uploads",
      data: [],
    };
  }
}

export async function deleteUploadById(uploadId) {
  try {
    return await apiFetch(`${ENDPOINTS.DELETE_UPLOAD}/${uploadId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("[uploadService] deleteUploadById failed", {
      uploadId,
      message: error?.message,
    });
    return {
      success: false,
      message: error.message || "Failed to delete upload",
    };
  }
}
