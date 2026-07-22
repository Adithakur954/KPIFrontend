import { useState } from "react";
import { Activity, ChevronDown, Download, Filter, Layers, Loader2, Minus, Plus, Radio, RotateCcw, Target, X } from "lucide-react";

export default function MapHeader({
  sidebarOpen,
  drawerMode,
  analyticsDrawerOpen,
  onToggleSidebar,
  onOpenFilter,
  onOpenAnalytics,
  siteMarkerScale = 1,
  cellRadiusScale = 1,
  onDecreaseSiteSize,
  onIncreaseSiteSize,
  onSiteSizeChange,
  onResetSiteSize,
  onDecreaseCellRadius,
  onIncreaseCellRadius,
  onCellRadiusChange,
  onResetCellRadius,
  onDownloadPdf,
  exportingPdf = false,
}) {
  const [utilityOpen, setUtilityOpen] = useState(false);
  const siteSizePercent = Math.round(siteMarkerScale * 100);
  const cellRadiusPercent = Math.round(cellRadiusScale * 100);

  return (
    <div className="z-30 flex h-16 min-h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/95 px-5 text-white shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 text-slate-300 shadow-sm transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white"
          title={sidebarOpen ? "Hide panel" : "Show panel"}
        >
          {sidebarOpen ? <X className="h-4.5 w-4.5" /> : <Filter className="h-4.5 w-4.5" />}
        </button>

        <div className="flex items-center gap-3 border-r border-slate-800/80 pr-4">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
            <Radio className="h-5 w-5 text-white" />
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border border-slate-950"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white">Coverage Map</span>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">LIVE</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">Network Telemetry & Analytics</div>
          </div>
        </div>

        <div className="ml-1 flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFilter}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
              drawerMode === "filter" && sidebarOpen
                ? "border-blue-500/60 bg-blue-600/90 text-white shadow-blue-600/20"
                : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Filter className="h-4 w-4 text-blue-400" />
            <span>Filter</span>
          </button>
          <button
            type="button"
            onClick={onOpenAnalytics}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
              analyticsDrawerOpen
                ? "border-blue-500/60 bg-blue-600/90 text-white shadow-blue-600/20"
                : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Analytics</span>
          </button>
          <button
            type="button"
            className="hidden items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white md:flex"
          >
            <Layers className="h-4 w-4 text-purple-400" />
            <span>Multi Map</span>
          </button>
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-900/30 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
            title="Download current map report as PDF"
          >
            {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Download className="h-4 w-4" />}
            <span>{exportingPdf ? "Generating..." : "Download PDF"}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUtilityOpen((open) => !open)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
                utilityOpen
                  ? "border-blue-500/60 bg-blue-600/90 text-white"
                  : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Target className="h-4 w-4 text-amber-400" />
              <span>Utility</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${utilityOpen ? "rotate-180" : ""}`} />
            </button>

            {utilityOpen && (
              <div className="absolute left-0 top-full z-50 mt-2.5 w-84 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                <SizeControl
                  title="Site Size"
                  description="Increase or reduce sector triangle scale"
                  percent={siteSizePercent}
                  value={siteMarkerScale}
                  onDecrease={onDecreaseSiteSize}
                  onIncrease={onIncreaseSiteSize}
                  onChange={onSiteSizeChange}
                  onReset={onResetSiteSize}
                  resetLabel="Reset site size"
                />
                <div className="my-3.5 border-t border-slate-800/80" />
                <SizeControl
                  title="Cell Radius"
                  description="Increase or reduce coverage circle scale"
                  percent={cellRadiusPercent}
                  value={cellRadiusScale}
                  onDecrease={onDecreaseCellRadius}
                  onIncrease={onIncreaseCellRadius}
                  onChange={onCellRadiusChange}
                  onReset={onResetCellRadius}
                  resetLabel="Reset cell radius"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 shadow-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white shadow-sm">
            A
          </div>
          <div className="hidden text-xs font-bold text-slate-200 md:block">Admin</div>
        </div>
      </div>
    </div>
  );
}

function SizeControl({
  title,
  description,
  percent,
  value,
  onDecrease,
  onIncrease,
  onChange,
  onReset,
  resetLabel,
}) {
  return (
    <div>
      <div className="mb-2.5">
        <div className="text-xs font-black tracking-wide text-slate-200">{title}</div>
        <div className="text-[11px] text-slate-400">{description}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrease}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-200 shadow-sm hover:border-slate-700 hover:bg-slate-800"
          title={`Reduce ${title.toLowerCase()}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-center shadow-inner">
          <div className="text-base font-black text-blue-400">{percent}%</div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Current scale</div>
        </div>
        <button
          type="button"
          onClick={onIncrease}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-200 shadow-sm hover:border-slate-700 hover:bg-slate-800"
          title={`Increase ${title.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <input
        type="range"
        min="0.05"
        max="8"
        step="0.05"
        value={value}
        onChange={(event) => onChange?.(Number(event.target.value))}
        className="mt-3 w-full accent-blue-500"
      />
      <div className="mt-1 flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500">
        <span>5%</span>
        <span>800%</span>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-bold text-slate-300 shadow-sm hover:border-slate-700 hover:bg-slate-800 hover:text-white"
      >
        <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
        {resetLabel}
      </button>
    </div>
  );
}

