import { findPredictionSite, predictionEvidence } from '../utils/predictionDisplay.mjs';

const labels = { LOAD_BALANCE: 'Load balancing', QUALITY_CHECK: 'Service quality', CAPACITY_REVIEW: 'Capacity review', COVERAGE_CHECK: 'Coverage review', OBSERVE: 'Observe' };

export default function PredictionEvidencePanel({ items, sites, fileId, fileName, siteFileId, plotted, visible, onFocus, truncated, synthetic }) {
  return <section aria-label="KPI recommendation evidence" className="space-y-3">
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
      <div className="font-bold text-white">KPI recommendations</div>
      <p className="mt-1">Screening based on the selected data. Rule-derived priority is not OSS alarm severity. Review with an RF engineer before changing network parameters; this is not a validated forecast.</p>
      <p className="mt-2">KPI: {fileId ? `#${fileId} ${fileName || ''}` : 'Not selected'} · Site file: {siteFileId ? `#${siteFileId}` : 'Not selected'}</p>
      <p className="mt-1">{items.length} loaded · {visible ? `${plotted} markers displayed` : 'Map layer off'}{truncated ? ' · results limited to the first 200' : ''}</p>
      <p className="mt-1 text-amber-300">A marker shows a matching site location, not verified cell coverage. Results without a matching location remain in this list.</p>
      {synthetic && <p className="mt-2 font-bold text-amber-300">SYNTHETIC DEMO — not customer findings.</p>}
    </div>
    <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
      {items.map((item, index) => {
        const site = findPredictionSite(item, sites);
        const { reasons, evidence } = predictionEvidence(item);
        return <details key={`${item.site}-${item.cellName}-${index}`} className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
          <summary className="cursor-pointer font-bold text-white">{item.cellName || item.site || 'Unidentified cell'} · {labels[item.actionCode] || 'Review'}</summary>
          <p className="mt-2">Site: {item.site || 'Not available'} · Band: {item.band || 'Not available'} · Technology: {item.technology || 'Not available'}</p>
          <p className="mt-2"><strong>Suggested investigation:</strong> {item.action || 'Review the available KPI evidence.'}</p>
          <p className="mt-2 font-bold">Why this was flagged</p>
          {reasons.length ? <ul className="ml-4 list-disc">{reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul> : <p>Explanation not available for this result.</p>}
          <p className="mt-2 font-bold">Evidence</p>
          {evidence.length ? <ul className="ml-4 list-disc">{evidence.map((value, i) => <li key={i}>{value}</li>)}</ul> : <p>No detailed KPI evidence supplied.</p>}
          <p className="mt-2 text-slate-400">{site ? 'Matched at site level; confirm the cell and sector in the inventory.' : 'Site not matched in the selected site file; no marker placed.'}</p>
          {site && <button type="button" onClick={() => onFocus(site)} className="mt-2 rounded-lg border border-slate-500 px-3 py-1.5 font-bold text-white hover:bg-slate-800">View site on map</button>}
        </details>;
      })}
      {!items.length && <p className="text-xs text-slate-400">No recommendations available for the selected file.</p>}
    </div>
  </section>;
}
