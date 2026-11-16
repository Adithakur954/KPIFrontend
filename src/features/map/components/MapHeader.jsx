import { useEffect, useRef, useState } from "react";
import { Activity, ChevronDown, Download, Filter, Layers, Loader2, LocateFixed, Minus, Plus, Radio, RotateCcw, Target } from "lucide-react";

export default function MapHeader({
  sidebarOpen, drawerMode, analyticsDrawerOpen, onOpenFilter, onOpenAnalytics,
  siteMarkerScale = 1, cellRadiusScale = 1,
  onDecreaseSiteSize, onIncreaseSiteSize, onSiteSizeChange, onResetSiteSize,
  onDecreaseCellRadius, onIncreaseCellRadius, onCellRadiusChange, onResetCellRadius,
  onDownloadPdf, exportingPdf = false, mapReady = true,
  siteCount = 0, cellCount = 0, dataReady = false, onFitSites, canFitSites = false,
  statusLabel = "Preparing map", needsAttention = false,
}) {
  const [utilityOpen, setUtilityOpen] = useState(false);
  const utility = useRef(null);
  const utilityButton = useRef(null);
  useEffect(() => {
    if (!utilityOpen) return;
    const closeOutside = event => { if (!utility.current?.contains(event.target)) setUtilityOpen(false); };
    const closeEscape = event => { if (event.key === "Escape") { setUtilityOpen(false); utilityButton.current?.focus(); } };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [utilityOpen]);

  return <header className="map-toolbar">
    <div className="map-toolbar-heading">
      <span className="map-toolbar-mark"><Radio size={22} /></span>
      <div><p>Monitoring / Spatial analysis</p><h1>Coverage Map</h1></div>
      <span className="map-toolbar-status" data-ready={mapReady} data-warning={needsAttention}><span />{statusLabel}</span>
      <div className="map-toolbar-counts"><span><strong>{dataReady ? siteCount.toLocaleString() : "--"}</strong> sites</span><span><strong>{dataReady ? cellCount.toLocaleString() : "--"}</strong> cells</span></div>
    </div>
    <div className="map-toolbar-actions" role="group" aria-label="Map controls">
      <button type="button" onClick={onOpenFilter} aria-controls="map-filter-panel" aria-expanded={drawerMode === "filter" && sidebarOpen} className="map-tool-button" data-active={drawerMode === "filter" && sidebarOpen}><Filter size={16} />Filter</button>
      <button type="button" onClick={onOpenAnalytics} aria-controls="map-analytics-panel" aria-expanded={analyticsDrawerOpen} className="map-tool-button" data-active={analyticsDrawerOpen}><Activity size={16} />Analytics</button>
      <button type="button" onClick={onFitSites} disabled={!canFitSites} aria-label="Fit map to sites" title="Fit all filtered sites in the map" className="map-tool-button map-fit-button"><LocateFixed size={16} /><span>Fit sites</span></button>
      <div ref={utility} className="map-display-control">
        <button ref={utilityButton} type="button" onClick={() => setUtilityOpen(open => !open)} aria-expanded={utilityOpen} aria-controls="map-display-settings" className="map-tool-button" data-active={utilityOpen}><Target size={16} />Display<ChevronDown size={13} /></button>
        {utilityOpen && <div id="map-display-settings" role="region" aria-label="Map display settings" className="map-display-popover">
          <SizeControl title="Site Size" description="Adjust site marker visibility" percent={Math.round(siteMarkerScale * 100)} value={siteMarkerScale} onDecrease={onDecreaseSiteSize} onIncrease={onIncreaseSiteSize} onChange={onSiteSizeChange} onReset={onResetSiteSize} resetLabel="Reset site size" />
          <div className="my-4 border-t border-slate-700" />
          <SizeControl title="Cell Radius" description="Adjust cell sector coverage" percent={Math.round(cellRadiusScale * 100)} value={cellRadiusScale} onDecrease={onDecreaseCellRadius} onIncrease={onIncreaseCellRadius} onChange={onCellRadiusChange} onReset={onResetCellRadius} resetLabel="Reset cell radius" />
        </div>}
      </div>
      <button type="button" onClick={onDownloadPdf} disabled={exportingPdf || !mapReady} aria-label={exportingPdf ? "Generating PDF" : "Download PDF"} className="map-tool-button map-tool-primary">{exportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}<span>{exportingPdf ? "Preparing..." : "Export PDF"}</span></button>
    </div>
  </header>;
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
        aria-label={title}
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
