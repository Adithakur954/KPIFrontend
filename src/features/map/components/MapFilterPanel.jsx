import { AlertTriangle, Eye, EyeOff, FileText, Filter, Layers, Sparkles } from "lucide-react";
import ToggleSwitch from "../../../components/common/ToggleSwitch";
import LbPredictionControls from "./LbPredictionControls";
import MapKpiSelector from "./MapKpiSelector";

export default function MapFilterPanel({
  fetchError,
  totalSiteRows,
  missingCoordinateRows,
  mapDataCount,
  siteUploads,
  selectedSiteFileId,
  onSiteFileChange,
  uploads,
  selectedFileId,
  onKpiFileChange,
  metrics,
  selectedMetric,
  onMetricChange,
  technologyOptions,
  selectedTechnology,
  onTechnologyChange,
  bandOptions,
  selectedBand,
  onBandChange,
  pciOptions,
  pciFilter,
  onPciFilterChange,
  onClearDataFilters,
  showCells,
  onToggleCells,
  showWorstSites,
  onToggleWorstSites,
  showPredictions,
  onTogglePredictions,
  predictionSummary,
  predictionItems = [],
  onPredictionClick,
  formatNumber = (value) => value,
  lbPredictionControlProps,
  showAlarms,
  onToggleAlarms,
}) {
  return (
    <div className="space-y-4 border-b border-slate-800/80 bg-slate-950 p-4 text-slate-100">
      {(fetchError || mapDataCount === 0) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Site data map status</span>
          </div>
          <div className="mt-1.5 text-xs leading-5 text-amber-300/90">
            {fetchError ||
              (totalSiteRows > 0
                ? `${totalSiteRows} site row(s) found, but ${missingCoordinateRows} row(s) do not have valid lat/lon values.`
                : "No uploaded site rows found yet. Upload Site Data first.")}
          </div>
        </div>
      )}

      {/* Group 1: Data Sources */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-400">
          <FileText className="h-4 w-4" />
          <span>Data Sources</span>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Site Upload File
            </label>
            <select
              value={selectedSiteFileId}
              onChange={(event) => onSiteFileChange(event.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="" className="bg-slate-900 text-slate-400">Select Site Data file</option>
              {siteUploads.map((upload) => (
                <option key={`site-upload-${upload.id}`} value={upload.id} className="bg-slate-900 text-white">
                  #{upload.id} - {upload.fileName}
                </option>
              ))}
            </select>
            {siteUploads.length === 0 && (
              <p className="mt-1.5 text-[11px] font-semibold text-amber-400">
                No Site Data upload found. Upload Site Data first.
              </p>
            )}
          </div>

          <MapKpiSelector
            uploads={uploads}
            selectedFileId={selectedFileId}
            onKpiFileChange={onKpiFileChange}
            metrics={metrics}
            selectedMetric={selectedMetric}
            onMetricChange={onMetricChange}
            showMetric
            compact
          />
        </div>
      </div>

      {/* Group 2: Site Data Filters */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-400">
            <Filter className="h-4 w-4" />
            <span>Site Data Filters</span>
          </div>
          <button
            type="button"
            onClick={onClearDataFilters}
            className="rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-[11px] font-bold text-slate-300 shadow-sm transition-all hover:bg-slate-700 hover:text-white"
          >
            Clear
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Technology
            </label>
            <select
              value={selectedTechnology}
              onChange={(event) => onTechnologyChange(event.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-500"
            >
              <option value="" className="bg-slate-900 text-slate-400">All technologies</option>
              {technologyOptions.map((technology) => (
                <option key={technology} value={technology} className="bg-slate-900 text-white">
                  {technology}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Band
            </label>
            <select
              value={selectedBand}
              onChange={(event) => onBandChange(event.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-500"
            >
              <option value="" className="bg-slate-900 text-slate-400">All bands</option>
              {bandOptions.map((band) => (
                <option key={band} value={band} className="bg-slate-900 text-white">
                  {band}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              PCI
            </label>
            <input
              value={pciFilter}
              onChange={(event) => onPciFilterChange(event.target.value)}
              list="map-pci-filter-options"
              placeholder="All PCI"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />
            <datalist id="map-pci-filter-options">
              {pciOptions.map((pci) => (
                <option key={pci} value={pci} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {/* Group 3: Map Layer Toggles */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-400">
          <Layers className="h-4 w-4" />
          <span>Map Layer Controls</span>
        </div>

        <div className="space-y-3">
          <ToggleSwitch
            enabled={showCells}
            onChange={onToggleCells}
            label={showCells ? "Cells ON" : "Cells OFF"}
            description="Coverage Layer"
            activeColor="bg-blue-500"
            Icon={showCells ? Eye : EyeOff}
          />

          <ToggleSwitch
            enabled={showWorstSites}
            onChange={onToggleWorstSites}
            label={showWorstSites ? "Worst Sites ON" : "Worst Sites OFF"}
            description={showWorstSites ? "Orange poor-site markers visible" : "Turn on to show orange poor-site markers"}
            activeColor="bg-orange-500"
            Icon={AlertTriangle}
          />

          <ToggleSwitch
            enabled={showPredictions}
            onChange={onTogglePredictions}
            label={showPredictions ? "Predictions ON" : "Predictions OFF"}
            description="Recommendations"
            activeColor="bg-purple-500"
            Icon={Sparkles}
          />

          {showPredictions && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-2">
              {lbPredictionControlProps && (
                <LbPredictionControls {...lbPredictionControlProps} compact />
              )}
            </div>
          )}

          <ToggleSwitch
            enabled={showAlarms}
            onChange={onToggleAlarms}
            label={showAlarms ? "Alarms ON" : "Alarms OFF"}
            description="Alarm Markers"
            activeColor="bg-red-500"
            Icon={AlertTriangle}
          />
        </div>
      </div>
    </div>
  );
}

