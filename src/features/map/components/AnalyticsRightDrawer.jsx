import { useEffect, useId } from "react";
import { X } from "lucide-react";

export default function AnalyticsRightDrawer({ open, onClose, title = "Analytics", subtitle, tabs = [], activeTab, onTabChange, headerChildren, children }) {
  const id = useId();
  const close = () => {
    onClose();
    document.querySelector('[aria-controls="map-analytics-panel"]')?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const onKey = event => {
      if (event.key !== "Escape" || document.querySelector('dialog[open], .map-display-popover')) return;
      onClose();
      document.querySelector('[aria-controls="map-analytics-panel"]')?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const active = tabs.find(tab => tab.value === activeTab) || tabs[0];
  const moveTab = (event, index) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    onTabChange?.(tabs[next].value);
    document.getElementById(`${id}-tab-${tabs[next].value}`)?.focus();
  };
  return <section id="map-analytics-panel" aria-labelledby={`${id}-title`} className="map-analytics-drawer">
    <header className="map-analytics-header">
      <div className="map-analytics-title"><div><p>Map workspace</p><h2 id={`${id}-title`}>{title}</h2>{subtitle && <span>{subtitle}</span>}</div><button type="button" onClick={close} aria-label="Close analytics" title="Close analytics"><X size={18} /></button></div>
      {tabs.length > 0 && <div role="tablist" aria-label="Map analytics sections" className="map-analytics-tabs">
        {tabs.map((tab, index) => <button key={tab.value} id={`${id}-tab-${tab.value}`} type="button" role="tab" aria-selected={activeTab === tab.value} aria-controls={`${id}-content`} tabIndex={activeTab === tab.value ? 0 : -1} onKeyDown={event => moveTab(event, index)} onClick={() => onTabChange?.(tab.value)}>{tab.label}</button>)}
      </div>}
    </header>
    <div className="map-analytics-scroll" id={`${id}-content`} role="tabpanel" aria-labelledby={active ? `${id}-tab-${active.value}` : `${id}-title`} tabIndex={0}>
      {headerChildren && <div className="mb-4">{headerChildren}</div>}
      {children}
    </div>
  </section>;
}
