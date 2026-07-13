import { AlertTriangle, Eye, EyeOff, Sparkles } from "lucide-react";
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
    <div className="space-y-3 border-b border-slate-800 bg-slate-950 p-4">
      {(fetchError || mapDataCount === 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="text-sm font-bold text-amber-100">Site data map status</div>
          <div className="mt-1 text-xs leading-5 text-amber-200">
            {fetchError ||
              (totalSiteRows > 0
                ? `${totalSiteRows} site row(s) found, but ${missingCoordinateRows} row(s) do not have valid lat/lon values.`
                : "No uploaded site rows found yet. Upload Site Data first.")}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
          Site Upload File
        </label>
        <select
          value={selectedSiteFileId}
          onChange={(event) => onSiteFileChange(event.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Select Site Data file</option>
          {siteUploads.map((upload) => (
            <option key={`site-upload-${upload.id}`} value={upload.id}>
              #{upload.id} - {upload.fileName}
            </option>
          ))}
        </select>
        {siteUploads.length === 0 && (
          <p className="mt-1 text-[11px] font-semibold text-amber-300">
            No Site Data upload found. Upload Site Data first.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
          KPI File For Map Analysis
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

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-xs font-black uppercase tracking-wide text-slate-400">
            Site Data Filters
          </div>
          <button
            type="button"
            onClick={onClearDataFilters}
            className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-800"
          >
            Clear
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Technology
            </label>
            <select
              value={selectedTechnology}
              onChange={(event) => onTechnologyChange(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="">All technologies</option>
              {technologyOptions.map((technology) => (
                <option key={technology} value={technology}>
                  {technology}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Band
            </label>
            <select
              value={selectedBand}
              onChange={(event) => onBandChange(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="">All bands</option>
              {bandOptions.map((band) => (
                <option key={band} value={band}>
                  {band}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              PCI
            </label>
            <input
              value={pciFilter}
              onChange={(event) => onPciFilterChange(event.target.value)}
              list="map-pci-filter-options"
              placeholder="All PCI"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />
            <datalist id="map-pci-filter-options">
              {pciOptions.map((pci) => (
                <option key={pci} value={pci} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="mb-4 text-xs font-black uppercase tracking-wide text-slate-400">
          Map Layer Filters
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
            <div className="rounded-xl border border-purple-300/40 bg-purple-950/30 p-3">
              {lbPredictionControlProps && (
                <div className="mb-3">
                  <LbPredictionControls {...lbPredictionControlProps} compact />
                </div>
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
