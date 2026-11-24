import { ArrowUpRight, BarChart3, Map, Radio } from "lucide-react";
import { Link } from "react-router-dom";

/** A navigation overview of the current inventory; no synthetic health scores. */
export default function NetworkOverview({ sites, cells, loading }) {
  const value = number => loading ? "…" : number == null ? "—" : Number(number).toLocaleString();
  return <section className="network-overview" aria-label="Network overview">
    <div className="network-overview-copy">
      <span className="network-overview-eyebrow"><Radio size={15} /> YOUR NETWORK. CONNECTED.</span>
      <h2>A clearer view of<br /><span>every connection.</span></h2>
      <p>Explore performance, spot issues and turn network data into informed action.</p>
      <div className="network-overview-actions">
        <Link to="/kpi"><BarChart3 size={16} />Explore KPI trends<ArrowUpRight size={16} /></Link>
        <Link to="/map"><Map size={16} />Open coverage map<ArrowUpRight size={16} /></Link>
      </div>
    </div>
    <div className="network-overview-inventory">
      <svg className="network-overview-art" viewBox="0 0 420 250" fill="none" aria-hidden="true">
        <ellipse cx="235" cy="130" rx="160" ry="98" stroke="currentColor" strokeDasharray="4 8" />
        <ellipse cx="235" cy="130" rx="108" ry="65" stroke="currentColor" />
        <path d="m72 120 100-65 63 75 111-53-36 122-75-69-94 68-69-78 238 79M172 55l-31 143M346 77 72 120" stroke="currentColor" />
        {[[72,120],[172,55],[346,77],[310,199],[141,198]].map(([x,y]) => <g key={x}><circle cx={x} cy={y} r="12" fill="#123e51" /><circle cx={x} cy={y} r="4" fill="#63e6cf" /></g>)}
        <circle cx="235" cy="130" r="25" fill="#123e51" stroke="#60dfca" />
        <path d="M225 131h5l3-10 5 20 3-10h5" stroke="#b4fff0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="network-overview-scope"><span>Current dashboard scope</span><div><strong>{value(sites)}</strong><span>sites</span><i /><strong>{value(cells)}</strong><span>cells</span></div></div>
    </div>
  </section>;
}
