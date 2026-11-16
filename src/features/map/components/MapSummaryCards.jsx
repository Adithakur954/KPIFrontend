import { Building2, Layers, Radio, ShieldAlert } from "lucide-react";

export default function MapSummaryCards({ sites, cells, bands, critical }) {
  const items = [
    { label: "Sites", value: sites, icon: Building2, tone: "blue" },
    { label: "Cells", value: cells, icon: Radio, tone: "teal" },
    { label: "Bands", value: bands, icon: Layers, tone: "violet" },
    { label: "Critical", value: critical, icon: ShieldAlert, tone: critical > 0 ? "red" : "muted" },
  ];
  return <div className="map-summary-grid" aria-label="Network inventory summary">
    {items.map(item => {
      const Icon = item.icon;
      return <div className="map-summary-card" data-tone={item.tone} key={item.label}>
        <div><span>{item.label}</span><strong>{Number.isFinite(Number(item.value)) ? Number(item.value).toLocaleString() : "—"}</strong></div>
        <span className="map-summary-icon"><Icon size={20} aria-hidden="true" /></span>
      </div>;
    })}
  </div>;
}
