import { apiFetch } from "../../services/apiClient";

const ENDPOINTS = {
  ALARM_UPLOAD: import.meta.env.VITE_UPLOAD_ALARM_ENDPOINT || "upload/alarm",
  ALARM_DATA: import.meta.env.VITE_ALARM_DATA_ENDPOINT || "upload/alarm-data",
  KPI_ALARMS: import.meta.env.VITE_KPI_ALARMS_ENDPOINT || "alarms",
};

export async function uploadAlarmFile(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    return await apiFetch(ENDPOINTS.ALARM_UPLOAD, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    return {
      success: false,
      message: error.message || "An error occurred during upload",
    };
  }
}

const defaultAlarmResponse = {
  success: false,
  message: "Failed to fetch alarm data",
  data: [],
  pagination: {
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

export async function getAlarmData(params = {}) {
  try {
    return await apiFetch(ENDPOINTS.ALARM_DATA, {
      method: "GET",
      query: {
        page: params.page,
        limit: params.limit,
        circle: params.circle,
        severity: params.severity,
        name: params.name,
        search: params.search,
        startDate: params.startDate,
        endDate: params.endDate,
      },
    });
  } catch (error) {
    return {
      ...defaultAlarmResponse,
      message: error.message || defaultAlarmResponse.message,
    };
  }
}

export async function generateKpiAlarms(fileId) {
  try {
    return await apiFetch(`${ENDPOINTS.KPI_ALARMS}/generate`, {
      method: "POST",
      query: { fileId },
    });
  } catch (error) {
    return { success: false, message: error.message || "Failed to generate KPI alarms" };
  }
}

export async function fetchKpiAlarmSummary(fileId) {
  try {
    return await apiFetch(`${ENDPOINTS.KPI_ALARMS}/summary`, {
      method: "GET",
      query: { fileId },
    });
  } catch (error) {
    return { success: false, message: error.message || "Failed to fetch alarm summary", data: null };
  }
}

export async function fetchKpiAlarms(params = {}) {
  try {
    return await apiFetch(ENDPOINTS.KPI_ALARMS, {
      method: "GET",
      query: {
        fileId: params.fileId,
        severity: params.severity,
        status: params.status,
        page: params.page,
        limit: params.limit,
      },
    });
  } catch (error) {
    return { success: false, message: error.message || "Failed to fetch KPI alarms", data: { items: [], total: 0 } };
  }
}

export async function acknowledgeKpiAlarm(id, payload = {}) {
  try {
    return await apiFetch(`${ENDPOINTS.KPI_ALARMS}/${id}/acknowledge`, {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    return { success: false, message: error.message || "Failed to acknowledge alarm" };
  }
}

export async function resolveKpiAlarm(id, payload = {}) {
  try {
    return await apiFetch(`${ENDPOINTS.KPI_ALARMS}/${id}/resolve`, {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    return { success: false, message: error.message || "Failed to resolve alarm" };
  }
}
