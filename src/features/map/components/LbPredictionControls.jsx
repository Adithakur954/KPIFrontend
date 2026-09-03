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
    <div className={`${compact ? "mb-3" : "mt-3"} rounded-xl border border-purple-500/30 bg-slate-900/90 p-3 shadow-lg backdrop-blur-md`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-purple-300">Run LB/WCF On Map</div>
          <div className="text-[10px] text-slate-400">
            {compact ? "TA file is optional for coverage features." : "Uses selected KPI upload; TA distance file is optional."}
          </div>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-black text-white shadow-md shadow-purple-900/30 transition-all hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          title={!selectedFileId ? "Select a KPI file first" : "Run LB/WCF prediction"}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-purple-200" />}
          Run LB
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={method}
          onChange={(event) => onMethodChange(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 outline-none focus:border-purple-500"
        >
          <option value="both" className="bg-slate-900 text-slate-100">Rule + ML</option>
          <option value="rule-based" className="bg-slate-900 text-slate-100">Rule only</option>
          <option value="ml-based" className="bg-slate-900 text-slate-100">ML only</option>
        </select>
        <select
          value={mlMode}
          onChange={(event) => onMlModeChange(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 outline-none focus:border-purple-500"
        >
          <option value="1" className="bg-slate-900 text-slate-100">DL throughput</option>
          <option value="2" className="bg-slate-900 text-slate-100">PRB DL util</option>
          <option value="3" className="bg-slate-900 text-slate-100">Both</option>
        </select>
        <input
          value={quantile}
          onChange={(event) => onQuantileChange(event.target.value)}
          type="number"
          min="0"
          max="1"
          step="0.01"
          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 outline-none focus:border-purple-500"
          title="Rule-based DL throughput quantile"
        />
        <label
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-purple-500 hover:bg-slate-900"
          title={taFile?.name || "Optional TA distance file"}
        >
          <FileUp className="h-3.5 w-3.5 shrink-0 text-purple-400" />
          <span className="min-w-0 truncate">
            {taFile?.name || "Optional TA File"}
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
        <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300">
          No TA file selected. Run will use KPI-only mode.
        </div>
      )}
      {warnings.length > 0 && (
        <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300">
          {warnings[0]}
        </div>
      )}
      {(message || result) && ( 
        <div className={`mt-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${statusIsSuccess ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {message}
          {result && ` Rows: ${formatNumber(result.summary?.rows)} | Unbalanced: ${formatNumber(result.summary?.unbalanced_count)}`}
        </div>
      )}
    </div>
  );
}
