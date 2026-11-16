import { Activity, ArrowUpRight, ListFilter } from "lucide-react";
import { evidenceForRow, driversForRow, targetForEvidence } from "../utils/evidence";
import "@/styles/rca-evidence.css";

export function EvidencePreview({ row, config, onOpen }) {
  const items = evidenceForRow(row);
  const first = items[0];
  const target = first && targetForEvidence(first, config);
  return <div className="rca-evidence-preview">
    {first ? <>
      <p className="rca-evidence-label"><Activity size={13} aria-hidden="true" />{items.length} KPI {items.length === 1 ? "observation" : "observations"}</p>
      {first.metric ? <><p className="rca-evidence-metric">{first.metric}</p><p className="rca-evidence-comparison"><strong>{first.observed}</strong>{first.mean !== null && <span>Mean {first.mean}</span>}<span>Median {first.median}</span><span>Target {target?.label ?? "Not available"}</span></p></> : <p className="rca-evidence-raw-preview">{first.raw}</p>}
    </> : <p className="rca-evidence-missing">No KPI evidence returned.</p>}
    <button type="button" className="rca-evidence-open" onClick={onOpen} aria-label={`View evidence for ${row["Short name"] || "cell"}`}>{first ? "View evidence" : "View cell details"}<ArrowUpRight size={14} aria-hidden="true" /></button>
  </div>;
}

export default function EvidencePanel({ row, config }) {
  const items = evidenceForRow(row);
  const structured = items.filter(item => item.metric);
  const remaining = items.filter(item => !item.metric);
  const drivers = driversForRow(row);
  return <section className="rca-evidence-panel" aria-label="KPI evidence">
    <div className="rca-evidence-heading"><span><Activity size={18} aria-hidden="true" /></span><div><h3>KPI evidence</h3><p>Observed values, period mean, median and target for this RCA configuration.</p></div></div>
    {structured.length > 0 && <>
      <div className="rca-evidence-table-wrap" role="region" aria-label="KPI evidence values" tabIndex={0}>
        <table className="rca-evidence-table">
          <thead><tr><th scope="col">KPI</th><th scope="col">Observed</th><th scope="col">Period Mean</th><th scope="col">Median</th><th scope="col">Target</th></tr></thead>
          <tbody>{structured.map((item, index) => {
            const target = targetForEvidence(item, config);
            return <tr key={`${item.metric}-${index}`}><th scope="row">{item.metric}</th><td>{item.observed}</td><td>{item.mean === null || item.mean === "NA" ? "Not available" : item.mean}</td><td>{item.median}</td><td className="rca-evidence-target">{target ? <span title={target.direction === "high_good" ? "Higher is better" : "Lower is better"}>{target.label}</span> : <span className="rca-target-unavailable">Not available</span>}</td></tr>;
          })}</tbody>
        </table>
      </div>
      <p className="rca-target-help">Target is the configured RCA threshold: ≥ minimum, ≤ maximum. Units follow the KPI label. Unmatched targets are not inferred.</p>
      <p className="rca-target-help">Period Mean is the arithmetic average for the same cell and KPI in this analysis period. Missing/nonfinite values are excluded; zero is included. Pre/Post periods are separate. For older results, rerun RCA to calculate the mean.</p>
    </>}
    {remaining.length > 0 && <ul className="rca-evidence-notes">{remaining.map((item, index) => <li key={index}>{item.raw}</li>)}</ul>}
    {!items.length && <p className="rca-evidence-empty">The analysis did not return KPI evidence for this row. Values have not been inferred.</p>}
    {drivers && <div className="rca-evidence-drivers"><h4><ListFilter size={15} aria-hidden="true" />Top KPI drivers</h4><p>{drivers}</p><small>Driver scores are shown as returned by the analysis.</small></div>}
  </section>;
}
