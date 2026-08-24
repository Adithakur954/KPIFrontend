import { AlertTriangle, Hash, Radio, Sparkles } from "lucide-react";

export default function MapLayerLegend({
  showCells,
  cellSectorCounts = {},
  getColorBySector,
  showWorstSites,
  worstCount = 0,
  showPredictions,
  predictionCounts = {},
  showAlarms,
  alarmCounts = {},
  predictionActionColors = {},
  severityMarkerColors = {},
  selectedPci = "",
  sourcePciLabel = "",
  selectedPciCount = 0,
  samePciSiteCount = 0,
  pciLayerLabel = "Other same-PCI sites",
}) {
  const predictionItems = [
    ["Load Balance", "LOAD_BALANCE"],
    ["Quality", "QUALITY_CHECK"],
    ["Capacity", "CAPACITY_REVIEW"],
    ["Coverage", "COVERAGE_CHECK"],
  ].filter(([, key]) => Number(predictionCounts[key] || 0) > 0);

  const alarmItems = [
    ["Critical", "CRITICAL"],
    ["Major", "MAJOR"],
    ["Minor", "MINOR"],
    ["Warning", "WARNING"],
  ].filter(([, key]) => Number(alarmCounts[key] || 0) > 0);

  const cellItems = Object.entries(cellSectorCounts).sort(([left], [right]) => left.localeCompare(right));

  const showPciLegend = Boolean(selectedPci);

  if (!showCells && !showWorstSites && !showPredictions && !showAlarms && !showPciLegend) return null;

  return (
    <div className="absolute bottom-6 right-6 z-10 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-800/80 bg-slate-950/90 p-3.5 text-slate-100 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
        <div>
          <div className="text-xs font-black tracking-wide text-white uppercase">Map Layer Legend</div>
          <div className="text-[11px] text-slate-400">Live marker counts & color schema</div>
        </div>
      </div>

      <div className="space-y-3">
        {showCells && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/30 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-400">
                <Radio className="h-3.5 w-3.5 text-blue-400" />
                <span>Cells</span>
              </div>
              <span className="rounded-full bg-blue-600/30 px-2 py-0.5 text-xs font-black text-blue-300 border border-blue-500/40">
                {cellItems.reduce((sum, [, count]) => sum + Number(count || 0), 0)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {cellItems.length === 0 ? (
                <div className="col-span-2 text-xs font-semibold text-slate-400">No visible cells</div>
              ) : (
                cellItems.map(([sector, count]) => {
                  const colors = getColorBySector?.(sector, 1) || {};
                  return (
                    <div key={sector} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="h-3 w-3 shrink-0 rounded"
                          style={{
                            backgroundColor: colors.fill || "#3B82F6",
                            border: `1px solid ${colors.stroke || "#2563EB"}`,
                          }}
                        />
                        <span className="truncate text-[11px] font-bold text-slate-300">Sector {sector}</span>
                      </div>
                      <span className="text-[11px] font-black text-white">{count}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {showPciLegend && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/30 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">PCI {selectedPci}</span>
              </div>
              <span className="rounded-full bg-amber-600/30 px-2 py-0.5 text-xs font-black text-amber-300 border border-amber-500/40">
                {selectedPciCount}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 ring-2 ring-amber-500/40" />
                  <span className="truncate text-[11px] font-bold text-slate-300">
                    Source: {sourcePciLabel || "Selected site"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                  <span className="truncate text-[11px] font-bold text-slate-300">{pciLayerLabel}</span>
                </div>
                <span className="text-[11px] font-black text-white">{samePciSiteCount}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="truncate text-[11px] font-bold text-slate-300">Other visible sites</span>
              </div>
            </div>
          </div>
        )}

        {showWorstSites && (
          <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Worst Cells</span>
              </div>
              <span className="rounded-full bg-red-600/30 px-2 py-0.5 text-xs font-black text-red-300 border border-red-500/40">{worstCount}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-sm">1</span>
              <span>Red numbered markers</span>
            </div>
          </div>
        )}

        {showPredictions && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-950/30 p-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-purple-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Prediction Cells</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {predictionItems.length === 0 ? (
                <div className="col-span-2 text-xs font-semibold text-slate-400">No prediction markers</div>
              ) : (
                predictionItems.map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: predictionActionColors[key] || "#7C3AED" }} />
                      <span className="truncate text-[11px] font-bold text-slate-300">{label}</span>
                    </div>
                    <span className="text-[11px] font-black text-white">{predictionCounts[key]}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {showAlarms && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/30 p-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
              <Radio className="h-3.5 w-3.5" />
              <span>Alarm Cells</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {alarmItems.length === 0 ? (
                <div className="col-span-2 text-xs font-semibold text-slate-400">No alarm markers</div>
              ) : (
                alarmItems.map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: severityMarkerColors[key] || "#2563EB" }} />
                      <span className="truncate text-[11px] font-bold text-slate-300">{label}</span>
                    </div>
                    <span className="text-[11px] font-black text-white">{alarmCounts[key]}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
