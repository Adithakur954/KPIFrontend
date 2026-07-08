import { useState } from "react";
import { Activity, ChevronDown, Filter, Layers, Minus, Plus, RotateCcw, Target, X } from "lucide-react";

export default function MapHeader({
  sidebarOpen,
  drawerMode,
  analyticsDrawerOpen,
  onToggleSidebar,
  onOpenFilter,
  onOpenAnalytics,
  siteMarkerScale = 1,
  onDecreaseSiteSize,
  onIncreaseSiteSize,
  onResetSiteSize,
}) {
  const [utilityOpen, setUtilityOpen] = useState(false);
  const siteSizePercent = Math.round(siteMarkerScale * 100);

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
            <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-950 p-3 text-white shadow-2xl">
              <div className="mb-3">
                <div className="text-sm font-black">Site Size</div>
                <div className="text-xs text-slate-400">Increase or reduce site circle radius</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onDecreaseSiteSize}
                  className="rounded-xl bg-slate-800 p-3 text-slate-100 hover:bg-slate-700"
                  title="Reduce site size"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center">
                  <div className="text-lg font-black">{siteSizePercent}%</div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Current size</div>
                </div>
                <button
                  type="button"
                  onClick={onIncreaseSiteSize}
                  className="rounded-xl bg-slate-800 p-3 text-slate-100 hover:bg-slate-700"
                  title="Increase site size"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={onResetSiteSize}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset site size
              </button>
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
