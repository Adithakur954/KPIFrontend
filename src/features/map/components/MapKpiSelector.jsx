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
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          KPI Upload File
        </label>
        <select
          value={selectedFileId}
          onChange={(event) => onKpiFileChange(event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Select KPI file</option>
          {uploads.map((upload) => (
            <option key={upload.id} value={upload.id}>
              #{upload.id} - {upload.fileName}
            </option>
          ))}
        </select>
        {uploads.length === 0 && (
          <p className="mt-1 text-[11px] font-semibold text-amber-600">
            No KPI upload found. Upload KPI Data first.
          </p>
        )}
      </div>

      {showMetric && (
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Worst Cell KPI Metric
          </label>
          <select
            value={selectedMetric}
            onChange={(event) => onMetricChange(event.target.value)}
            disabled={!selectedFileId || metrics.length === 0}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {metrics.length === 0 ? "No KPI metrics found" : "Select metric"}
            </option>
            {metrics.map((metric) => (
              <option key={metric.value} value={metric.value}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
