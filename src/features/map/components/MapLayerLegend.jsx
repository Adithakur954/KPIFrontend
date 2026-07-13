import { AlertTriangle, Radio, Sparkles } from "lucide-react";

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

  if (!showCells && !showWorstSites && !showPredictions && !showAlarms) return null;

  return (
    <div className="absolute bottom-5 right-5 z-10 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl ring-1 ring-white/70 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-900">Map Layer Legend</div>
          <div className="text-xs text-slate-500">Dynamic marker colors and counts</div>
        </div>
      </div>

      <div className="space-y-3">
        {showCells && (
          <div className="rounded-xl bg-blue-50 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-700">
                <Radio className="h-3.5 w-3.5" />
                Cells
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-blue-700">
                {cellItems.reduce((sum, [, count]) => sum + Number(count || 0), 0)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {cellItems.length === 0 ? (
                <div className="col-span-2 text-xs font-semibold text-slate-500">No visible cells</div>
              ) : (
                cellItems.map(([sector, count]) => {
                  const colors = getColorBySector?.(sector, 1) || {};
                  return (
                    <div key={sector} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="h-3 w-3 shrink-0 rounded"
                          style={{
                            backgroundColor: colors.fill || "#3B82F6",
                            border: `1px solid ${colors.stroke || "#2563EB"}`,
                          }}
                        />
                        <span className="truncate text-[11px] font-bold text-slate-700">Sector {sector}</span>
                      </div>
                      <span className="text-[11px] font-black text-slate-900">{count}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {showWorstSites && (
          <div className="rounded-xl bg-red-50 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Worst Cells
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-red-700">{worstCount}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white">1</span>
              Red numbered markers
            </div>
          </div>
        )}

        {showPredictions && (
          <div className="rounded-xl bg-purple-50 p-2">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-purple-700">
              <Sparkles className="h-3.5 w-3.5" />
              Prediction Cells
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {predictionItems.length === 0 ? (
                <div className="col-span-2 text-xs font-semibold text-slate-500">No prediction markers</div>
              ) : (
                predictionItems.map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: predictionActionColors[key] || "#7C3AED" }} />
                      <span className="truncate text-[11px] font-bold text-slate-700">{label}</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-900">{predictionCounts[key]}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {showAlarms && (
          <div className="rounded-xl bg-amber-50 p-2">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-amber-700">
              <Radio className="h-3.5 w-3.5" />
              Alarm Cells
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {alarmItems.length === 0 ? (
                <div className="col-span-2 text-xs font-semibold text-slate-500">No alarm markers</div>
              ) : (
                alarmItems.map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: severityMarkerColors[key] || "#2563EB" }} />
                      <span className="truncate text-[11px] font-bold text-slate-700">{label}</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-900">{alarmCounts[key]}</span>
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
