import { FileUp, Loader2, Sparkles } from "lucide-react";

export default function LbPredictionControls({
  selectedFileId,
  loading,
  method,
  mlMode,
  quantile,
  taFile,
  message,
  result,
  onRun,
  onMethodChange,
  onMlModeChange,
  onQuantileChange,
  onTaFileChange,
  formatNumber,
  compact = false,
}) {
  const canRun = Boolean(selectedFileId) && !loading;
  const statusIsSuccess = Boolean(result);
  const warnings = result?.summary?.warnings || result?.warnings || [];

  return (
    <div className={`${compact ? "mb-3" : "mt-3"} rounded-lg border border-purple-100 bg-white p-2`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-black uppercase text-purple-900">Run LB/WCF On Map</div>
          <div className="text-[10px] text-slate-500">
            {compact ? "TA file is optional for coverage features." : "Uses selected KPI upload; TA distance file is optional."}
          </div>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-purple-700 disabled:opacity-60"
          title={!selectedFileId ? "Select a KPI file first" : "Run LB/WCF prediction"}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Run LB
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={method}
          onChange={(event) => onMethodChange(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700"
        >
          <option value="both">Rule + ML</option>
          <option value="rule-based">Rule only</option>
          <option value="ml-based">ML only</option>
        </select>
        <select
          value={mlMode}
          onChange={(event) => onMlModeChange(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700"
        >
          <option value="1">DL throughput</option>
          <option value="2">PRB DL util</option>
          <option value="3">Both</option>
        </select>
        <input
          value={quantile}
          onChange={(event) => onQuantileChange(event.target.value)}
          type="number"
          min="0"
          max="1"
          step="0.01"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700"
          title="Rule-based DL throughput quantile"
        />
        <label
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-purple-300 hover:bg-purple-50"
          title={taFile?.name || "Optional TA distance file"}
        >
          <FileUp className="h-3.5 w-3.5 shrink-0 text-purple-600" />
          <span className="min-w-0 truncate">
            {taFile?.name || "Optional TA Distance File"}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => onTaFileChange(event.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
      </div>
      {!taFile && (
        <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-700">
          No TA file selected. Run will use KPI-only mode.
        </div>
      )}
      {warnings.length > 0 && (
        <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-700">
          {warnings[0]}
        </div>
      )}
      {(message || result) && ( 
        <div className={`mt-2 rounded-lg px-2 py-1.5 text-[11px] font-bold ${statusIsSuccess ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message}
          {result && ` Rows: ${formatNumber(result.summary?.rows)} | Unbalanced: ${formatNumber(result.summary?.unbalanced_count)}`}
        </div>
      )}
    </div>
  );
}
