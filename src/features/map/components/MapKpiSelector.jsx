export default function MapKpiSelector({
  uploads,
  selectedFileId,
  onKpiFileChange,
  metrics = [],
  selectedMetric = "",
  onMetricChange,
  showMetric = false,
  compact = false,
}) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
          KPI Upload File
        </label>
        <select
          value={selectedFileId}
          onChange={(event) => onKpiFileChange(event.target.value)}
          className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-sm font-semibold text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="" className="bg-slate-900 text-slate-400">Select KPI file</option>
          {uploads.map((upload) => (
            <option key={upload.id} value={upload.id} className="bg-slate-900 text-slate-100">
              #{upload.id} - {upload.fileName}
            </option>
          ))}
        </select>
        {uploads.length === 0 && (
          <p className="mt-1.5 text-[11px] font-semibold text-amber-400">
            No KPI upload found. Upload KPI Data first.
          </p>
        )}
      </div>

      {showMetric && (
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Worst Cell KPI Metric
          </label>
          <select
            value={selectedMetric}
            onChange={(event) => onMetricChange(event.target.value)}
            disabled={!selectedFileId || metrics.length === 0}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-sm font-semibold text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-900/40 disabled:text-slate-600"
          >
            <option value="" className="bg-slate-900 text-slate-400">
              {metrics.length === 0 ? "No KPI metrics found" : "Select metric"}
            </option>
            {metrics.map((metric) => (
              <option key={metric.value} value={metric.value} className="bg-slate-900 text-slate-100">
                {metric.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

