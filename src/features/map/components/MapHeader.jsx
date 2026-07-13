import { useState } from "react";
import { Activity, ChevronDown, Download, Filter, Layers, Loader2, Minus, Plus, RotateCcw, Target, X } from "lucide-react";

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
    <div className="z-30 flex h-16 min-h-16 items-center justify-between bg-slate-900 px-4 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-xl bg-slate-800 p-3 text-slate-100 hover:bg-slate-700"
          title={sidebarOpen ? "Hide panel" : "Show panel"}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Filter className="h-5 w-5" />}
        </button>
        <div>
          <div className="text-xl font-black leading-tight">Coverage Map</div>
          <div className="text-xs text-slate-400">Network Visualization</div>
        </div>
        <button
          type="button"
          onClick={onOpenFilter}
          className={`ml-2 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
            drawerMode === "filter" && sidebarOpen
              ? "bg-blue-600 text-white"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }`}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Filter className="h-5 w-5" />}
          {sidebarOpen ? "" : "Filter"}
        </button>
        <button
          type="button"
          onClick={onOpenAnalytics}
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
            analyticsDrawerOpen
              ? "bg-blue-600 text-white"
              : "bg-slate-800 text-slate-200 hover:bg-slate-700"
          }`}
        >
          <Activity className="h-4 w-4" />
          Analytics
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700"
        >
          <Layers className="h-4 w-4" />
          Multi Map
        </button>
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={exportingPdf}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          title="Download current map report as PDF"
        >
          {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exportingPdf ? "Generating..." : "Download PDF"}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setUtilityOpen((open) => !open)}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
              utilityOpen
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            <Target className="h-4 w-4" />
            Utility
            <ChevronDown className={`h-4 w-4 transition-transform ${utilityOpen ? "rotate-180" : ""}`} />
          </button>

          {utilityOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-700 bg-slate-950 p-3 text-white shadow-2xl">
              <SizeControl
                title="Site Size"
                description="Increase or reduce sector triangle size"
                percent={siteSizePercent}
                value={siteMarkerScale}
                onDecrease={onDecreaseSiteSize}
                onIncrease={onIncreaseSiteSize}
                onChange={onSiteSizeChange}
                onReset={onResetSiteSize}
                resetLabel="Reset site size"
              />
              <div className="my-3 border-t border-slate-800" />
              <SizeControl
                title="Cell Radius"
                description="Increase or reduce round circle size"
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
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-600 px-3 py-2 text-sm font-black">A</div>
        <div className="hidden text-sm font-bold md:block">Admin</div>
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
      <div className="mb-3">
        <div className="text-sm font-black">{title}</div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrease}
          className="rounded-xl bg-slate-800 p-3 text-slate-100 hover:bg-slate-700"
          title={`Reduce ${title.toLowerCase()}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center">
          <div className="text-lg font-black">{percent}%</div>
          <div className="text-[10px] font-bold uppercase text-slate-500">Current size</div>
        </div>
        <button
          type="button"
          onClick={onIncrease}
          className="rounded-xl bg-slate-800 p-3 text-slate-100 hover:bg-slate-700"
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
      <div className="mt-1 flex justify-between text-[10px] font-bold uppercase text-slate-500">
        <span>5%</span>
        <span>800%</span>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {resetLabel}
      </button>
    </div>
  );
}
