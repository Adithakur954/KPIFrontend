import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { fetchUploads } from "../uploads/services/uploadService";
import {
  acknowledgeKpiAlarm,
  fetchKpiAlarms,
  fetchKpiAlarmSummary,
  generateKpiAlarms,
  resolveKpiAlarm,
} from "./alarmsService";
import { useAuth } from "../../context/AutContext";

const severityClasses = {
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
  MAJOR: "border-orange-200 bg-orange-50 text-orange-700",
  MINOR: "border-amber-200 bg-amber-50 text-amber-700",
  WARNING: "border-blue-200 bg-blue-50 text-blue-700",
};

const statusClasses = {
  OPEN: "border-red-200 bg-red-50 text-red-700",
  ACKNOWLEDGED: "border-blue-200 bg-blue-50 text-blue-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  IGNORED: "border-slate-200 bg-slate-50 text-slate-700",
};

function isKpiUpload(upload) {
  return [upload?.remarks, upload?.fileName, upload?.originalName]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes("kpi"));
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value) {
  if (!value) return "-";
  const raw = String(value);
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const date = new Date(hasTimezone ? raw : `${raw}Z`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function SummaryCard({ label, value, tone }) {
  const tones = {
    red: "border-red-100 bg-red-50 text-red-800",
    orange: "border-orange-100 bg-orange-50 text-orange-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
    green: "border-emerald-100 bg-emerald-50 text-emerald-800",
    slate: "border-slate-200 bg-white text-slate-900",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold">{number(value)}</p>
    </div>
  );
}

export default function AlarmsPage() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [summary, setSummary] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedAlarm, setSelectedAlarm] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadUploads();
  }, []);

  useEffect(() => {
    if (selectedFileId) {
      loadAlarmData();
    }
  }, [selectedFileId, severity, status]);

  const filteredAlarms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return alarms;
    return alarms.filter((alarm) =>
      [
        alarm.cellName,
        alarm.site,
        alarm.technology,
        alarm.metricName,
        alarm.message,
        alarm.recommendation,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [alarms, search]);

  const loadUploads = async () => {
    const response = await fetchUploads();
    const kpiUploads = response?.success && Array.isArray(response.data)
      ? response.data.filter(isKpiUpload)
      : [];
    setUploads(kpiUploads);
    if (!selectedFileId && kpiUploads.length > 0) {
      setSelectedFileId(String(kpiUploads[0].id));
    }
  };

  const loadAlarmData = async () => {
    if (!selectedFileId) return;
    setLoading(true);
    setMessage("");
    try {
      const [summaryResponse, listResponse] = await Promise.all([
        fetchKpiAlarmSummary(selectedFileId),
        fetchKpiAlarms({ fileId: selectedFileId, severity, status, page: 1, limit: 200 }),
      ]);

      if (summaryResponse?.success) {
        setSummary(summaryResponse.data || null);
      } else {
        setSummary(null);
        setMessage(summaryResponse?.message || "Alarm summary could not be loaded.");
      }

      if (listResponse?.success) {
        setAlarms(listResponse.data?.items || []);
        setTotal(listResponse.data?.total || 0);
      } else {
        setAlarms([]);
        setTotal(0);
        setMessage(listResponse?.message || "Alarms could not be loaded.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFileId) return;
    setGenerating(true);
    setMessage("");
    try {
      const response = await generateKpiAlarms(selectedFileId);
      setMessage(response?.message || "Alarm generation complete.");
      await loadAlarmData();
    } finally {
      setGenerating(false);
    }
  };

  const updateAlarmStatus = async (alarm, action) => {
    const remarks = window.prompt(`${action === "ack" ? "Acknowledge" : "Resolve"} remarks`, "");
    if (remarks === null) return;
    setActionId(alarm.id);
    const payload = { user: user?.email || "system", remarks };
    const response =
      action === "ack"
        ? await acknowledgeKpiAlarm(alarm.id, payload)
        : await resolveKpiAlarm(alarm.id, payload);
    if (!response?.success) {
      setMessage(response?.message || "Alarm action failed.");
    } else {
      setMessage(response.message || "Alarm updated.");
      await loadAlarmData();
      if (selectedAlarm?.id === alarm.id) {
        setSelectedAlarm(response.data || null);
      }
    }
    setActionId(null);
  };

  const severityCounts = summary?.severityCounts || {};
  const statusCounts = summary?.statusCounts || {};

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <Bell className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">KPI Alarm Dashboard</h1>
                <p className="text-sm text-slate-500">
                  Generated KPI breaches, status tracking, and engineer actions.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={loadAlarmData}
            disabled={loading || !selectedFileId}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.7fr_0.7fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">KPI Upload File</label>
              <select
                value={selectedFileId}
                onChange={(event) => setSelectedFileId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select KPI upload</option>
                {uploads.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    #{upload.id} - {upload.fileName || "KPI upload"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Severity</label>
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="MAJOR">Major</option>
                <option value="MINOR">Minor</option>
                <option value="WARNING">Warning</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={!selectedFileId || generating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Generate
              </button>
            </div>
          </div>
          {message && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              {message}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
          <SummaryCard label="Total" value={summary?.total || total} tone="slate" />
          <SummaryCard label="Critical" value={severityCounts.CRITICAL} tone="red" />
          <SummaryCard label="Major" value={severityCounts.MAJOR} tone="orange" />
          <SummaryCard label="Minor" value={severityCounts.MINOR} tone="amber" />
          <SummaryCard label="Warning" value={severityCounts.WARNING} tone="blue" />
          <SummaryCard label="Open" value={statusCounts.OPEN} tone="red" />
          <SummaryCard label="Acknowledged" value={statusCounts.ACKNOWLEDGED} tone="blue" />
          <SummaryCard label="Resolved" value={statusCounts.RESOLVED} tone="green" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Generated Alarms</h2>
              <p className="text-sm text-slate-500">{number(filteredAlarms.length)} visible of {number(total)} alarm(s)</p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search cell, site, metric..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading alarms...
            </div>
          ) : filteredAlarms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <CheckCircle className="mb-3 h-10 w-10 text-emerald-500" />
              <p className="text-sm font-semibold">No generated alarms found.</p>
              <p className="mt-1 text-xs">Generate alarms after selecting a KPI upload file.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Cell / Site</th>
                    <th className="px-4 py-3">Metric</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Threshold</th>
                    <th className="px-4 py-3">Recommendation</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAlarms.map((alarm) => (
                    <tr key={alarm.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[alarm.severity] || severityClasses.WARNING}`}>
                          {alarm.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[alarm.status] || statusClasses.OPEN}`}>
                          {alarm.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{alarm.cellName || "-"}</div>
                        <div className="text-xs text-slate-500">{alarm.site || "-"} / {alarm.technology || "-"}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{alarm.metricName}</td>
                      <td className="px-4 py-3 text-slate-600">{alarm.metricValue ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{alarm.thresholdValue ?? "-"}</td>
                      <td className="max-w-md px-4 py-3 text-xs text-slate-600">
                        <div className="line-clamp-2">{alarm.recommendation || alarm.message || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedAlarm(alarm)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          {alarm.status === "OPEN" && (
                            <button
                              onClick={() => updateAlarmStatus(alarm, "ack")}
                              disabled={actionId === alarm.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Ack
                            </button>
                          )}
                          {alarm.status !== "RESOLVED" && (
                            <button
                              onClick={() => updateAlarmStatus(alarm, "resolve")}
                              disabled={actionId === alarm.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedAlarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Alarm Detail</h3>
                <p className="mt-1 text-sm text-slate-500">#{selectedAlarm.id} - {selectedAlarm.metricName}</p>
              </div>
              <button onClick={() => setSelectedAlarm(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              {[
                ["Severity", selectedAlarm.severity],
                ["Status", selectedAlarm.status],
                ["Cell", selectedAlarm.cellName],
                ["Site", selectedAlarm.site],
                ["Technology", selectedAlarm.technology],
                ["Band", selectedAlarm.band],
                ["Sector", selectedAlarm.sectorId],
                ["Metric Value", selectedAlarm.metricValue],
                ["Threshold", selectedAlarm.thresholdValue],
                ["Created", formatDate(selectedAlarm.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 font-semibold text-slate-900">{value ?? "-"}</p>
                </div>
              ))}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Message</p>
                <p className="mt-1 text-sm text-slate-800">{selectedAlarm.message || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Recommendation</p>
                <p className="mt-1 text-sm text-slate-800">{selectedAlarm.recommendation || "-"}</p>
              </div>
              {selectedAlarm.remarks && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Engineer Remarks</p>
                  <p className="mt-1 text-sm text-slate-800">{selectedAlarm.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
