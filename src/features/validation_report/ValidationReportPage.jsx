import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  FileCheck,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { fetchUploads } from "../uploads/services/uploadService";
import {
  fetchDynamicMetrics,
  fetchValidationReport,
  fetchWorstCellDetail,
  fetchWorstCells,
  fetchWorstSites,
} from "./validationReportService";

const severityClasses = {
  CRITICAL: "bg-red-50 text-red-700 border-red-200",
  MAJOR: "bg-orange-50 text-orange-700 border-orange-200",
  MINOR: "bg-amber-50 text-amber-700 border-amber-200",
  WARNING: "bg-blue-50 text-blue-700 border-blue-200",
  NORMAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function isKpiUpload(upload) {
  return [upload?.remarks, upload?.fileName, upload?.originalName]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes("kpi"));
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

function metricLabel(metric) {
  return metric?.label || metric?.name || metric?.metricName || metric?.key || "";
}

function metricKey(metric) {
  return metric?.key || metric?.metricKey || metric?.name || metricLabel(metric);
}

function StatCard({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    green: "border-emerald-100 bg-emerald-50 text-emerald-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    red: "border-red-100 bg-red-50 text-red-800",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function WorstTable({ title, rows, groupKey, loading, onRowClick }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-500">No data found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">{groupKey === "cell" ? "Cell" : "Site"}</th>
                <th className="px-4 py-3">Tech</th>
                <th className="px-4 py-3">Average</th>
                <th className="px-4 py-3">Min</th>
                <th className="px-4 py-3">Max</th>
                <th className="px-4 py-3">Breaches</th>
                <th className="px-4 py-3">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr
                  key={`${groupKey}-${row.rank}-${row[groupKey]}`}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-slate-50 ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  <td className="px-4 py-3 font-semibold text-slate-700">#{row.rank}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row[groupKey] || "-"}</div>
                    {groupKey === "site" && row.cellName && (
                      <div className="text-xs text-slate-500">Worst cell: {row.cellName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.technology || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.averageValue ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.minValue ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.maxValue ?? "-"}</td>
                  <td className="px-4 py-3 font-semibold text-red-700">{row.breachCount || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[row.severity] || severityClasses.NORMAL}`}>
                      {row.severity || "NORMAL"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ValidationReportPage() {
  const [uploads, setUploads] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [metrics, setMetrics] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [report, setReport] = useState(null);
  const [worstCells, setWorstCells] = useState([]);
  const [worstSites, setWorstSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [message, setMessage] = useState("");
  const [worstMessage, setWorstMessage] = useState("");
  const [cellDetail, setCellDetail] = useState(null);
  const [loadingCellDetail, setLoadingCellDetail] = useState(false);

  const kpiUploads = useMemo(() => uploads.filter(isKpiUpload), [uploads]);

  useEffect(() => {
    loadUploads();
  }, []);

  useEffect(() => {
    if (selectedFileId) {
      loadFileContext(selectedFileId);
    }
  }, [selectedFileId]);

  async function loadUploads() {
    setLoading(true);
    const response = await fetchUploads();
    const items = response?.success && Array.isArray(response.data) ? response.data : [];
    setUploads(items);
    const firstKpi = items.find(isKpiUpload);
    if (firstKpi) {
      setSelectedFileId(String(firstKpi.id));
    }
    setLoading(false);
  }

  async function loadFileContext(fileId) {
    setLoadingAnalysis(true);
    setMessage("");
    setWorstMessage("");
    setCellDetail(null);
    const [reportResponse, metricResponse] = await Promise.all([
      fetchValidationReport(fileId),
      fetchDynamicMetrics(fileId),
    ]);

    if (reportResponse?.success) {
      setReport(reportResponse.data);
    } else {
      setReport(null);
      setMessage(reportResponse?.message || "Failed to load validation report.");
    }

    const metricItems = (metricResponse?.success
      ? (Array.isArray(metricResponse.metrics) ? metricResponse.metrics : metricResponse.data?.metrics || [])
      : [])
      .filter((metric) => metricKey(metric));
    setMetrics(metricItems);
    const firstMetric = metricItems[0];
    const nextMetric = firstMetric ? metricKey(firstMetric) : "";
    setSelectedMetric(nextMetric);
    if (nextMetric) {
      await loadWorst(fileId, nextMetric);
    } else {
      setWorstCells([]);
      setWorstSites([]);
    }
    setLoadingAnalysis(false);
  }

  async function loadWorst(fileId = selectedFileId, metric = selectedMetric) {
    if (!fileId || !metric) return;
    setLoadingAnalysis(true);
    setWorstMessage("");
    setCellDetail(null);
    const [cellsResponse, sitesResponse] = await Promise.all([
      fetchWorstCells({ fileId, metric, limit: 10 }),
      fetchWorstSites({ fileId, metric, limit: 10 }),
    ]);
    setWorstCells(cellsResponse?.success ? cellsResponse.data?.data || [] : []);
    setWorstSites(sitesResponse?.success ? sitesResponse.data?.data || [] : []);
    if (!cellsResponse?.success || !sitesResponse?.success) {
      setWorstMessage(cellsResponse?.message || sitesResponse?.message || "Failed to load worst cells/sites.");
    }
    setLoadingAnalysis(false);
  }

  function handleMetricChange(value) {
    setSelectedMetric(value);
    loadWorst(selectedFileId, value);
  }

  async function handleWorstCellClick(row) {
    const cellName = row?.cell || row?.cellName;
    if (!selectedFileId || !selectedMetric || !cellName) return;
    setLoadingCellDetail(true);
    const response = await fetchWorstCellDetail({
      fileId: selectedFileId,
      cellName,
      metric: selectedMetric,
    });
    if (response?.success) {
      setCellDetail(response.data);
    } else {
      setWorstMessage(response?.message || "Failed to load worst cell detail.");
      setCellDetail(null);
    }
    setLoadingCellDetail(false);
  }

  const thresholdCounts = report?.thresholdResult?.severityCounts || {};

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Validation & Worst Performance</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review KPI upload quality, threshold health, worst cells, and worst sites.
            </p>
          </div>
          <button
            type="button"
            onClick={() => selectedFileId && loadFileContext(selectedFileId)}
            disabled={!selectedFileId || loadingAnalysis}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-60"
          >
            {loadingAnalysis ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh Analysis
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">KPI Upload File</label>
              <select
                value={selectedFileId}
                onChange={(event) => setSelectedFileId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {kpiUploads.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    #{upload.id} - {upload.fileName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Worst Performance Metric</label>
              <select
                value={selectedMetric}
                onChange={(event) => handleMetricChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {metrics.map((metric) => (
                  <option key={metricKey(metric)} value={metricKey(metric)}>
                    {metricLabel(metric)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => loadWorst()}
                disabled={!selectedFileId || !selectedMetric || loadingAnalysis}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                Analyze
              </button>
            </div>
          </div>
          {message && <p className="mt-3 text-sm font-medium text-red-600">{message}</p>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading uploads...
          </div>
        ) : !selectedFileId ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-24 text-center text-sm text-slate-500">
            No KPI uploads found.
          </div>
        ) : !report ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Validation report could not be loaded.</p>
                <p className="mt-1 text-sm">
                  {message || "Please restart the backend, refresh this page, and select the file again."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Status" value={report?.status || "-"} tone={report?.status === "PASSED" ? "green" : "amber"} />
              <StatCard label="Total Rows" value={number(report?.totalRows)} />
              <StatCard label="Invalid Rows" value={number(report?.invalidRows)} tone={report?.invalidRows > 0 ? "red" : "green"} />
              <StatCard label="Metric Columns" value={number(report?.metricColumns)} tone="blue" />
              <StatCard label="Duplicates" value={number(report?.duplicateRows)} tone={report?.duplicateRows > 0 ? "amber" : "green"} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Validation Report</h2>
                </div>
                {report?.warnings?.length ? (
                  <div className="space-y-2">
                    {report.warnings.map((warning) => (
                      <div key={warning} className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                    <CheckCircle className="h-4 w-4" />
                    No validation warnings found.
                  </div>
                )}
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {Object.entries(report?.missingDimensions || {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">{key}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{number(value)} missing</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Threshold Summary</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["CRITICAL", "MAJOR", "MINOR", "WARNING", "NORMAL"].map((severity) => (
                    <div key={severity} className={`rounded-xl border p-3 ${severityClasses[severity]}`}>
                      <p className="text-xs font-semibold">{severity}</p>
                      <p className="mt-1 text-xl font-bold">{number(thresholdCounts[severity])}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                  Matched {number(report?.thresholdResult?.matchedRules)} of {number(report?.thresholdResult?.evaluatedValues)} evaluated KPI values.
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              {worstMessage && (
                <div className="xl:col-span-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {worstMessage}
                </div>
              )}
              <WorstTable title="Worst Cells" rows={worstCells} groupKey="cell" loading={loadingAnalysis} onRowClick={handleWorstCellClick} />
              <WorstTable title="Worst Sites" rows={worstSites} groupKey="site" loading={loadingAnalysis} />
            </div>

            {(loadingCellDetail || cellDetail) && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="text-lg font-semibold text-slate-900">Worst Cell Drill-Down</h2>
                  <p className="text-xs text-slate-500">Date-wise KPI behavior for the selected worst cell.</p>
                </div>
                {loadingCellDetail ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading cell detail...
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 p-5 md:grid-cols-5">
                      <StatCard label="Cell" value={cellDetail?.cellName || "-"} />
                      <StatCard label="Samples" value={number(cellDetail?.pointCount)} tone="blue" />
                      <StatCard label="Average" value={cellDetail?.summary?.averageValue ?? "-"} />
                      <StatCard label="Breaches" value={number(cellDetail?.summary?.breachCount)} tone={cellDetail?.summary?.breachCount > 0 ? "red" : "green"} />
                      <StatCard label="Worst Severity" value={cellDetail?.summary?.severity || "NORMAL"} tone={cellDetail?.summary?.severity === "NORMAL" ? "green" : "red"} />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Value</th>
                            <th className="px-4 py-3">Severity</th>
                            <th className="px-4 py-3">Site</th>
                            <th className="px-4 py-3">Tech</th>
                            <th className="px-4 py-3">Band</th>
                            <th className="px-4 py-3">Sector</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(cellDetail?.points || []).slice(0, 100).map((point, index) => (
                            <tr key={`${point.date}-${index}`} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-800">{point.date || "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{point.value ?? "-"}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[point.severity] || severityClasses.NORMAL}`}>
                                  {point.severity || "NORMAL"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{point.site || "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{point.technology || "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{point.band || "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{point.sectorId || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
