import { Activity, ArrowRight, CalendarDays, Database, FileBarChart } from "lucide-react";
import { Link } from "react-router-dom";

export default function OverviewPanel({ loading, evaluatedCount, degradedCount, upload }) {
  const assessed = !loading && evaluatedCount > 0;
  const withinCount = Math.max(0, evaluatedCount - degradedCount);
  const withinPercent = assessed ? Math.round(withinCount / evaluatedCount * 100) : 0;
  const uploadedAt = upload?.createdAt ? new Date(upload.createdAt) : null;

  return <section aria-label="Performance overview" className="portal-overview">
    <div className="portal-overview-primary">
      <div className="portal-overview-heading"><span><Activity size={16} />Performance overview</span><span className="portal-overview-tag">{loading ? "Updating" : assessed ? "Threshold assessment" : "Awaiting assessment"}</span></div>
      <p className="portal-overview-question">Where does your network need attention?</p>
      <div className="portal-overview-value"><strong>{loading ? "..." : assessed ? degradedCount : "--"}</strong><div><p>KPIs outside threshold</p><span>{loading ? "Checking..." : assessed ? `${degradedCount} / ${evaluatedCount} evaluated KPI aggregates` : "No evaluated KPI aggregates available"}</span></div></div>
      {assessed && <div className="portal-overview-meter"><div role="meter" aria-label="KPIs within threshold" aria-valuemin={0} aria-valuemax={evaluatedCount} aria-valuenow={withinCount} aria-valuetext={`${withinCount} of ${evaluatedCount} within threshold`}><span style={{ width: `${withinPercent}%` }} /></div><p><span>{withinCount} within threshold</span><span>{degradedCount} outside threshold</span></p></div>}
      <Link to="/kpi" className="portal-overview-link">Explore KPI trends <ArrowRight size={16} /></Link>
    </div>
    <div className="portal-overview-secondary">
      <div className="portal-overview-source"><span className="portal-overview-small-icon"><Database size={19} /></span><div><p className="portal-eyebrow">Selected data source</p><h2 title={upload?.fileName}>{upload?.fileName || "All KPI uploads"}</h2><p>{uploadedAt && Number.isFinite(uploadedAt.getTime()) ? `Uploaded: ${uploadedAt.toLocaleString()}` : "Select an upload to focus the analysis."}</p></div></div>
      <div className="portal-overview-comparison"><CalendarDays size={19} /><div><h2>Put today's results in context</h2><p>Compare daily performance with the previous day and seven-day baseline.</p><Link to="/reports">Open daily comparisons <ArrowRight size={15} /></Link></div><FileBarChart className="portal-overview-report-icon" size={38} aria-hidden="true" /></div>
    </div>
  </section>;
}
