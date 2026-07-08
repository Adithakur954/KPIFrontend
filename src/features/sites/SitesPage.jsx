import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Activity,
  Building2,
  CheckCircle2,
  Layers,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  Signal,
  Sparkles,
  Target,
} from "lucide-react";
import { fetchUploads } from "../uploads/services/uploadService";
import {
  fetchSiteDetails,
  fetchSitePredictionRecommendations,
  fetchSitePredictionSummary,
  fetchSiteSummary,
} from "./siteAnalyticsService";

const statusClasses = {
  GOOD: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WATCH: "border-amber-200 bg-amber-50 text-amber-700",
  BAD: "border-orange-200 bg-orange-50 text-orange-700",
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
};

const severityClasses = {
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
  MAJOR: "border-orange-200 bg-orange-50 text-orange-700",
  MINOR: "border-amber-200 bg-amber-50 text-amber-700",
  WARNING: "border-blue-200 bg-blue-50 text-blue-700",
  NORMAL: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const actionClasses = {
  LOAD_BALANCE: "border-blue-200 bg-blue-50 text-blue-700",
  CAPACITY_REVIEW: "border-purple-200 bg-purple-50 text-purple-700",
  COVERAGE_CHECK: "border-amber-200 bg-amber-50 text-amber-700",
  QUALITY_CHECK: "border-red-200 bg-red-50 text-red-700",
  OBSERVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function isKpiUpload(upload) {
  return [upload?.remarks, upload?.fileName, upload?.originalName]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes("kpi"));
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

function percent(value) {
  const numeric = Number(value || 0);
  return `${Math.max(0, Math.min(100, Math.round(numeric)))}%`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function rankWorstSites(rows, limit = 10) {
  return [...asArray(rows)]
    .sort((left, right) => {
      const scoreDiff = Number(left.healthScore || 0) - Number(right.healthScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const criticalDiff = Number(right.criticalCount || 0) - Number(left.criticalCount || 0);
      if (criticalDiff !== 0) return criticalDiff;
      const majorDiff = Number(right.majorCount || 0) - Number(left.majorCount || 0);
      if (majorDiff !== 0) return majorDiff;
      return String(left.site || "").localeCompare(String(right.site || ""));
    })
    .slice(0, limit)
    .map((site, index) => ({ ...site, rank: index + 1 }));
}

function StatCard({ label, value, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
    green: "border-emerald-100 bg-emerald-50 text-emerald-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    orange: "border-orange-100 bg-orange-50 text-orange-800",
    red: "border-red-100 bg-red-50 text-red-800",
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        {Icon && <Icon className="h-5 w-5 opacity-70" />}
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ value }) {
  const status = value || "GOOD";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status] || statusClasses.GOOD}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ value }) {
  const severity = value || "NORMAL";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[severity] || severityClasses.NORMAL}`}>
      {severity}
    </span>
  );
}

function ActionBadge({ value }) {
  const action = value || "OBSERVE";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${actionClasses[action] || actionClasses.OBSERVE}`}>
      {action.replaceAll("_", " ")}
    </span>
  );
}

function HealthBar({ score }) {
  const numeric = Math.max(0, Math.min(100, Number(score || 0)));
  const color =
    numeric >= 90 ? "bg-emerald-500" : numeric >= 70 ? "bg-amber-500" : numeric >= 50 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="min-w-[140px]">
      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
        <span>Health</span>
        <span>{percent(numeric)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${numeric}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {text}
    </div>
  );
}

export default function SitesPage() {
  const [uploads, setUploads] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [summary, setSummary] = useState(null);
  const [predictionSummary, setPredictionSummary] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [siteDetails, setSiteDetails] = useState(null);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [predictionAction, setPredictionAction] = useState("");
  const [predictionSeverity, setPredictionSeverity] = useState("");

  const kpiUploads = useMemo(() => uploads.filter(isKpiUpload), [uploads]);
  const siteRows = asArray(summary?.data);

  const filteredSiteRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return siteRows;
    return siteRows.filter((site) =>
      [
        site.site,
        ...(site.bands || []),
        ...(site.technologies || []),
        site.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [siteRows, search]);

  const totals = useMemo(() => {
    return siteRows.reduce(
      (acc, site) => {
        acc.cells += Number(site.totalCells || 0);
        acc.sectors += Number(site.totalSectors || 0);
        site.bands?.forEach((band) => acc.bands.add(band));
        site.technologies?.forEach((technology) => acc.technologies.add(technology));
        return acc;
      },
      { cells: 0, sectors: 0, bands: new Set(), technologies: new Set() },
    );
  }, [siteRows]);

  const derivedWorstSites = useMemo(() => {
    return rankWorstSites(siteRows);
  }, [siteRows]);

  const filteredPredictions = useMemo(() => {
    return predictions.filter((item) => {
      if (predictionAction && item.actionCode !== predictionAction) return false;
      if (predictionSeverity && item.severity !== predictionSeverity) return false;
      return true;
    });
  }, [predictions, predictionAction, predictionSeverity]);

  useEffect(() => {
    loadUploads();
  }, []);

  useEffect(() => {
    if (selectedFileId) {
      loadSiteAnalytics(selectedFileId);
    }
  }, [selectedFileId]);

  async function loadUploads() {
    setLoadingUploads(true);
    const response = await fetchUploads();
    const items = response?.success && Array.isArray(response.data) ? response.data : [];
    setUploads(items);
    const firstKpi = items.find(isKpiUpload);
    if (firstKpi) {
      setSelectedFileId(String(firstKpi.id));
    }
    setLoadingUploads(false);
  }

  async function loadSiteAnalytics(fileId = selectedFileId) {
    if (!fileId) return;
    setLoadingAnalytics(true);
    setMessage("");
    setSiteDetails(null);
    setSelectedSite("");

    const summaryResponse = await fetchSiteSummary(fileId);
    await loadPredictions(fileId);

    if (summaryResponse?.success) {
      setSummary(summaryResponse.data);
      const firstWorstSite = rankWorstSites(summaryResponse.data?.data, 1)[0]?.site;
      if (firstWorstSite) {
        await openSite(firstWorstSite, fileId);
      }
    } else {
      setSummary(null);
      setMessage(summaryResponse?.message || "Failed to load site summary.");
    }

    setLoadingAnalytics(false);
  }

  async function openSite(siteName, fileId = selectedFileId) {
    if (!fileId || !siteName) return;
    setSelectedSite(siteName);
    setLoadingDetails(true);
    setMessage("");
    const response = await fetchSiteDetails(fileId, siteName);
    if (response?.success) {
      setSiteDetails(response.data);
    } else {
      setSiteDetails(null);
      setMessage(response?.message || "Failed to load site details.");
    }
    setLoadingDetails(false);
  }

  async function loadPredictions(fileId = selectedFileId, site = "") {
    if (!fileId) return;
    setLoadingPredictions(true);
    const [summaryResponse, recommendationsResponse] = await Promise.all([
      fetchSitePredictionSummary(fileId),
      fetchSitePredictionRecommendations({ fileId, site, limit: 80 }),
    ]);

    if (summaryResponse?.success) {
      setPredictionSummary(summaryResponse.data);
    } else {
      setPredictionSummary(null);
      setMessage(summaryResponse?.message || "Failed to load site prediction summary.");
    }

    if (recommendationsResponse?.success) {
      setPredictions(asArray(recommendationsResponse.data?.data));
    } else {
      setPredictions([]);
      setMessage(recommendationsResponse?.message || "Failed to load site prediction recommendations.");
    }
    setLoadingPredictions(false);
  }

  const statusCounts = summary?.statusCounts || {};

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Site Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track site health, threshold breaches, bands, technologies, sectors, and worst sites.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadSiteAnalytics()}
            disabled={!selectedFileId || loadingAnalytics}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-60"
          >
            {loadingAnalytics ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh Sites
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_360px]">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">KPI Upload File</label>
              <select
                value={selectedFileId}
                onChange={(event) => setSelectedFileId(event.target.value)}
                disabled={loadingUploads}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              >
                {kpiUploads.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    #{upload.id} - {upload.fileName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Search Sites</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search site, band, technology..."
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>
          {message && <p className="mt-3 text-sm font-medium text-red-600">{message}</p>}
        </div>

        {loadingUploads ? (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading uploads...
          </div>
        ) : !selectedFileId ? (
          <EmptyState text="No KPI uploads found." />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <StatCard label="Sites" value={number(summary?.siteCount)} icon={Building2} tone="blue" />
              <StatCard label="Cells" value={number(totals.cells)} icon={Radio} />
              <StatCard label="Sectors" value={number(totals.sectors)} icon={Target} />
              <StatCard label="Bands" value={number(totals.bands.size)} icon={Layers} />
              <StatCard label="Tech" value={number(totals.technologies.size)} icon={Signal} />
              <StatCard
                label="Critical Sites"
                value={number(statusCounts.CRITICAL)}
                icon={AlertTriangle}
                tone={statusCounts.CRITICAL > 0 ? "red" : "green"}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Good" value={number(statusCounts.GOOD)} icon={CheckCircle2} tone="green" />
              <StatCard label="Watch" value={number(statusCounts.WATCH)} icon={Activity} tone="amber" />
              <StatCard label="Bad" value={number(statusCounts.BAD)} icon={AlertTriangle} tone="orange" />
              <StatCard label="Critical" value={number(statusCounts.CRITICAL)} icon={AlertTriangle} tone="red" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_430px]">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="text-lg font-semibold text-slate-900">All Sites</h2>
                  <p className="text-xs text-slate-500">Click a site to view cell-level details and top breaches.</p>
                </div>
                {loadingAnalytics ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading site analytics...
                  </div>
                ) : filteredSiteRows.length === 0 ? (
                  <div className="p-5">
                    <EmptyState text="No site analytics found for this file." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Site</th>
                          <th className="px-4 py-3">Health</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Cells</th>
                          <th className="px-4 py-3">Sectors</th>
                          <th className="px-4 py-3">Bands</th>
                          <th className="px-4 py-3">Tech</th>
                          <th className="px-4 py-3">Breaches</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSiteRows.map((site) => (
                          <tr
                            key={site.site}
                            onClick={() => openSite(site.site)}
                            className={`cursor-pointer hover:bg-slate-50 ${selectedSite === site.site ? "bg-blue-50/60" : ""}`}
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{site.site || "-"}</div>
                              <div className="text-xs text-slate-500">{number(site.rowCount)} KPI rows</div>
                            </td>
                            <td className="px-4 py-3"><HealthBar score={site.healthScore} /></td>
                            <td className="px-4 py-3"><StatusBadge value={site.status} /></td>
                            <td className="px-4 py-3 text-slate-600">{number(site.totalCells)}</td>
                            <td className="px-4 py-3 text-slate-600">{number(site.totalSectors)}</td>
                            <td className="px-4 py-3 text-slate-600">{asArray(site.bands).join(", ") || "-"}</td>
                            <td className="px-4 py-3 text-slate-600">{asArray(site.technologies).join(", ") || "-"}</td>
                            <td className="px-4 py-3 font-semibold text-red-700">{number(site.breachCount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="text-lg font-semibold text-slate-900">Worst Sites</h2>
                  <p className="text-xs text-slate-500">Ranked by health score and threshold breach severity.</p>
                </div>
                {loadingAnalytics ? (
                  <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading...
                  </div>
                ) : derivedWorstSites.length === 0 ? (
                  <div className="p-5">
                    <EmptyState text="No worst site data found." />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {derivedWorstSites.map((site) => (
                      <button
                        key={`${site.rank}-${site.site}`}
                        type="button"
                        onClick={() => openSite(site.site)}
                        className="w-full p-4 text-left transition hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-400">Rank #{site.rank}</p>
                            <p className="mt-1 font-semibold text-slate-900">{site.site || "-"}</p>
                          </div>
                          <StatusBadge value={site.status} />
                        </div>
                        <div className="mt-3">
                          <HealthBar score={site.healthScore} />
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                          <div className="rounded-lg bg-red-50 p-2 font-semibold text-red-700">C {number(site.criticalCount)}</div>
                          <div className="rounded-lg bg-orange-50 p-2 font-semibold text-orange-700">M {number(site.majorCount)}</div>
                          <div className="rounded-lg bg-amber-50 p-2 font-semibold text-amber-700">m {number(site.minorCount)}</div>
                          <div className="rounded-lg bg-blue-50 p-2 font-semibold text-blue-700">W {number(site.warningCount)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-lg font-semibold text-slate-900">Site Details</h2>
                <p className="text-xs text-slate-500">Selected site cells, KPI averages, and highest threshold breaches.</p>
              </div>
              {loadingDetails ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading site details...
                </div>
              ) : !siteDetails ? (
                <div className="p-5">
                  <EmptyState text="Select a site to view details." />
                </div>
              ) : (
                <div className="space-y-5 p-5">
                  <div className="grid gap-4 md:grid-cols-5">
                    <StatCard label="Site" value={siteDetails.site || "-"} icon={Building2} />
                    <StatCard label="Cells" value={number(asArray(siteDetails.cells).length)} icon={Radio} tone="blue" />
                    <StatCard label="Breaches" value={number(siteDetails.breachCount)} icon={AlertTriangle} tone={siteDetails.breachCount > 0 ? "red" : "green"} />
                    <StatCard label="Health" value={percent(siteDetails.summary?.healthScore)} icon={Activity} />
                    <StatCard label="Status" value={siteDetails.summary?.status || "-"} icon={Signal} />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Cell</th>
                            <th className="px-4 py-3">Band</th>
                            <th className="px-4 py-3">Tech</th>
                            <th className="px-4 py-3">Sector</th>
                            <th className="px-4 py-3">Severity</th>
                            <th className="px-4 py-3">Breaches</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {asArray(siteDetails.cells).map((cell) => (
                            <tr key={cell.cellName} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-semibold text-slate-900">{cell.cellName || "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{cell.band || "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{cell.technology || "-"}</td>
                              <td className="px-4 py-3 text-slate-600">{cell.sector || "-"}</td>
                              <td className="px-4 py-3"><SeverityBadge value={cell.severity} /></td>
                              <td className="px-4 py-3 font-semibold text-red-700">{number(cell.breachCount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="rounded-xl border border-slate-100">
                      <div className="border-b border-slate-100 p-4">
                        <h3 className="font-semibold text-slate-900">Top Breaches</h3>
                      </div>
                      {asArray(siteDetails.topBreaches).length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">No threshold breaches found for this site.</div>
                      ) : (
                        <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                          {asArray(siteDetails.topBreaches).map((breach, index) => (
                            <div key={`${breach.cellName}-${breach.metricName}-${index}`} className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">{breach.metricName}</p>
                                  <p className="text-xs text-slate-500">{breach.cellName}</p>
                                </div>
                                <SeverityBadge value={breach.severity} />
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                                <div className="rounded-lg bg-slate-50 p-2">Value: <b>{breach.value ?? "-"}</b></div>
                                <div className="rounded-lg bg-slate-50 p-2">Rule: <b>{breach.threshold ?? "-"}</b></div>
                                <div className="rounded-lg bg-slate-50 p-2">Band: <b>{breach.band || "-"}</b></div>
                                <div className="rounded-lg bg-slate-50 p-2">Tech: <b>{breach.technology || "-"}</b></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Site Prediction Recommendations</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Combines KPI performance, uploaded site master data, and uploaded alarm context.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[170px_150px_auto]">
                  <select
                    value={predictionAction}
                    onChange={(event) => setPredictionAction(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">All actions</option>
                    <option value="LOAD_BALANCE">Load balance</option>
                    <option value="CAPACITY_REVIEW">Capacity review</option>
                    <option value="COVERAGE_CHECK">Coverage check</option>
                    <option value="QUALITY_CHECK">Quality check</option>
                    <option value="OBSERVE">Observe</option>
                  </select>
                  <select
                    value={predictionSeverity}
                    onChange={(event) => setPredictionSeverity(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">All severity</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="MAJOR">Major</option>
                    <option value="MINOR">Minor</option>
                    <option value="NORMAL">Normal</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => loadPredictions(selectedFileId, selectedSite)}
                    disabled={!selectedFileId || loadingPredictions}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-60"
                  >
                    {loadingPredictions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </button>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6">
                <StatCard label="Recommendations" value={number(predictionSummary?.recommendationCount)} icon={Sparkles} tone="blue" />
                <StatCard label="Load Balance" value={number(predictionSummary?.actionCounts?.LOAD_BALANCE)} icon={Activity} tone="blue" />
                <StatCard label="Capacity" value={number(predictionSummary?.actionCounts?.CAPACITY_REVIEW)} icon={Layers} tone="amber" />
                <StatCard label="Coverage" value={number(predictionSummary?.actionCounts?.COVERAGE_CHECK)} icon={Signal} tone="orange" />
                <StatCard label="Quality" value={number(predictionSummary?.actionCounts?.QUALITY_CHECK)} icon={AlertTriangle} tone="red" />
                <StatCard label="Critical" value={number(predictionSummary?.severityCounts?.CRITICAL)} icon={AlertTriangle} tone="red" />
              </div>

              {loadingPredictions ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading recommendations...
                </div>
              ) : filteredPredictions.length === 0 ? (
                <div className="p-5 pt-0">
                  <EmptyState text="No site prediction recommendations found." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Site / Cell</th>
                        <th className="px-4 py-3">Layer</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Severity</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3">Alarm</th>
                        <th className="px-4 py-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPredictions.map((item, index) => (
                        <tr key={`${item.site}-${item.cellName}-${index}`} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-700">#{item.rank || index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{item.site || "-"}</div>
                            <div className="text-xs text-slate-500">{item.cellName || "-"}</div>
                            {(item.siteInfo?.region || item.siteInfo?.cluster) && (
                              <div className="text-xs text-slate-400">
                                {[item.siteInfo?.region, item.siteInfo?.cluster].filter(Boolean).join(" / ")}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{item.band || "-"}</div>
                            <div className="text-xs text-slate-400">{item.technology || "-"}</div>
                          </td>
                          <td className="px-4 py-3"><ActionBadge value={item.actionCode} /></td>
                          <td className="px-4 py-3"><SeverityBadge value={item.severity} /></td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{item.score ?? 0}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.targetCell ? (
                              <>
                                <div className="font-medium">{item.targetCell}</div>
                                <div className="text-xs text-slate-400">{item.targetBand || "-"}</div>
                              </>
                            ) : "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="font-semibold">{number(item.alarmContext?.alarmCount)}</div>
                            <div className="max-w-[180px] truncate text-xs text-slate-400" title={item.alarmContext?.latestAlarm || ""}>
                              {item.alarmContext?.latestAlarm || "No alarm"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="max-w-[320px] font-medium text-slate-800">{item.action || "-"}</div>
                            <div className="mt-1 max-w-[320px] text-xs text-slate-500">
                              {asArray(item.reasons).slice(0, 2).join(" ")}
                            </div>
                            {asArray(item.evidence).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {asArray(item.evidence).slice(0, 3).map((evidence) => (
                                  <span key={evidence} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                    {evidence}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
