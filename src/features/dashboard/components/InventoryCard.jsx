export default function InventoryCard({ label, value, icon, loading }) {
  const Icon = icon;
  return <div className="portal-inventory-card">
    <div><p>{label}</p><strong>{loading ? <span className="portal-number-skeleton" aria-label="Loading" /> : value?.toLocaleString() ?? "—"}</strong></div>
    <span className="portal-inventory-icon"><Icon size={21} aria-hidden="true" /></span>
  </div>;
}
