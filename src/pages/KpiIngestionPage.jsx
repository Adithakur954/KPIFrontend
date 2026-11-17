import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, FileUp, RefreshCw, RotateCcw } from "lucide-react";
import PageHeading from "@/shared/components/common/PageHeading";
import PageState from "@/shared/components/common/PageState";
import {
  fetchKpiIngestionRuns,
  fetchKpiIngestionRun,
  retryKpiIngestionRun,
  startKpiIngestion,
} from "@/features/ingestion/services/kpiIngestionService";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50";
const activeStatuses = new Set(["QUEUED", "PROCESSING", "RUNNING"]);

function StatusBadge({ status }) {
  const value = String(status || "UNKNOWN").toUpperCase();
  const tone = value === "COMPLETED" || value === "SUCCEEDED"
    ? "bg-emerald-100 text-emerald-800"
    : value === "FAILED"
      ? "bg-rose-100 text-rose-800"
      : "bg-amber-100 text-amber-800";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}

function parseIdentityFields(value) {
  const fields = value.split(",").map((field) => field.trim()).filter(Boolean);
  if (!fields.length) throw new Error("Enter at least one identity field.");
  return fields;
}

export default function KpiIngestionPage() {
  const [file, setFile] = useState(null);
  const [fileId, setFileId] = useState("");
  const [identityText, setIdentityText] = useState("date, cellName");
  const [sourceName, setSourceName] = useState("common");
  const [mappingText, setMappingText] = useState("{}");
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeRunId, setActiveRunId] = useState(null);
  const fileInputRef = useRef(null);

  const hasActiveRun = useMemo(
    () => runs.some((run) => activeStatuses.has(String(run.status || "").toUpperCase())),
    [runs],
  );

  const loadRuns = useCallback(async (signal) => {
    try {
      setError("");
      const result = await fetchKpiIngestionRuns(20, signal);
      setRuns(result);
      const currentRun = result.find((run) => activeStatuses.has(String(run.status || "").toUpperCase()));
      if (currentRun?.id) setActiveRunId((previous) => previous || currentRun.id);
    } catch (loadError) {
      if (loadError.name !== "AbortError") setError(loadError.message || "Could not load KPI ingestion runs.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadRuns(controller.signal);
    return () => controller.abort();
  }, [loadRuns]);

  useEffect(() => {
    if (!activeRunId) return undefined;
    let cancelled = false;
    const refreshRun = async () => {
      try {
        const run = await fetchKpiIngestionRun(activeRunId);
        if (cancelled) return;
        setRuns((previous) => previous.map((item) => item.id === run.id ? { ...item, ...run } : item));
        if (!activeStatuses.has(String(run.status || "").toUpperCase())) setActiveRunId(null);
      } catch {
        // Keep the accepted run visible; the manual refresh can recover transient failures.
      }
    };
    refreshRun();
    const timer = window.setInterval(refreshRun, 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeRunId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!file) return setError("Choose a KPI file to ingest.");
    if (!Number.isSafeInteger(Number(fileId)) || Number(fileId) <= 0) return setError("Enter a valid uploaded KPI dataset ID.");

    let identityFields;
    let columnMapping;
    try {
      identityFields = parseIdentityFields(identityText);
      columnMapping = JSON.parse(mappingText || "{}");
      if (!columnMapping || Array.isArray(columnMapping) || typeof columnMapping !== "object") {
        throw new Error("Column mapping must be a JSON object.");
      }
    } catch (validationError) {
      return setError(validationError.message || "Check the ingestion settings.");
    }

    setSubmitting(true);
    try {
      const run = await startKpiIngestion({
        file,
        fileId: Number(fileId),
        identityFields,
        sourceName: sourceName.trim() || "common",
        columnMapping,
      });
      setNotice(`Ingestion run ${run.id ? `#${run.id} ` : ""}was accepted. Its status will refresh automatically.`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (run.id) setActiveRunId(run.id);
      await loadRuns();
    } catch (submitError) {
      setError(submitError.message || "Could not start KPI ingestion.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async (id) => {
    setRetryingId(id);
    setError("");
    setNotice("");
    try {
      const run = await retryKpiIngestionRun(id);
      setActiveRunId(run.id || id);
      setNotice(`Retry requested for run #${id}.`);
      await loadRuns();
    } catch (retryError) {
      setError(retryError.message || "Could not retry this ingestion run.");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <PageHeading
        title="Durable KPI ingestion"
        description="Submit a KPI file for tracked ingestion and monitor or retry its processing run."
        eyebrow="Data operations"
        icon={Activity}
        actions={<button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => { setLoading(true); loadRuns(); }}><RefreshCw size={15} /> Refresh runs</button>}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900">Start an ingestion run</h2>
          <p className="mt-1 text-sm text-slate-600">Choose the source file and the existing uploaded KPI dataset it belongs to. The backend queues the work and records a run ID.</p>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-slate-700">KPI file
            <input ref={fileInputRef} className={inputClass} type="file" accept=".csv,.xls,.xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
          </label>
          <label className="text-sm font-medium text-slate-700">Uploaded dataset ID
            <input className={inputClass} type="number" min="1" step="1" value={fileId} onChange={(event) => setFileId(event.target.value)} placeholder="For example, 500" required />
            <span className="mt-1 block text-xs font-normal text-slate-500">Use a KPI dataset ID, not an upload job or report ID.</span>
          </label>
          <label className="text-sm font-medium text-slate-700">Identity fields
            <input className={inputClass} value={identityText} onChange={(event) => setIdentityText(event.target.value)} placeholder="date, cellName" required />
            <span className="mt-1 block text-xs font-normal text-slate-500">Comma-separated field names used to identify canonical observations.</span>
          </label>
          <label className="text-sm font-medium text-slate-700">Source name
            <input className={inputClass} value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="common" />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Column mapping (JSON object)
            <textarea className={`${inputClass} min-h-24 font-mono`} value={mappingText} onChange={(event) => setMappingText(event.target.value)} spellCheck="false" />
          </label>
          <div className="md:col-span-2">
            <button className={buttonClass} type="submit" disabled={submitting}>{submitting ? <><RefreshCw size={16} className="animate-spin" /> Submitting…</> : <><FileUp size={16} /> Start ingestion</>}</button>
          </div>
        </form>
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h2 className="font-semibold text-slate-900">Recent ingestion runs</h2><p className="mt-1 text-xs text-slate-500">Active runs refresh every three seconds.</p></div>
          {hasActiveRun && <span className="text-xs font-medium text-amber-700">Processing updates…</span>}
        </div>
        {loading ? <PageState title="Loading ingestion runs" variant="loading" /> : runs.length === 0 ? <PageState title="No ingestion runs yet">Submit a KPI file above to start the first run.</PageState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Run</th><th className="px-5 py-3">Dataset</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Message</th><th className="px-5 py-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{runs.map((run) => <tr key={run.id}>
                <td className="px-5 py-3 font-medium text-slate-800">#{run.id}</td>
                <td className="px-5 py-3 text-slate-600">{run.fileId ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{run.sourceName || "common"}</td>
                <td className="px-5 py-3"><StatusBadge status={run.status} /></td>
                <td className="max-w-sm px-5 py-3 text-slate-600">{run.message || "—"}</td>
                <td className="px-5 py-3">{String(run.status).toUpperCase() === "FAILED" && <button type="button" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={retryingId === run.id} onClick={() => handleRetry(run.id)}><RotateCcw size={13} />{retryingId === run.id ? "Retrying…" : "Retry"}</button>}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
