import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Modal from "@/shared/components/common/Modal";
import { navigationForRole } from "@/shared/navigation/portalNavigation";

export default function QuickNavigation({ role, onClose }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const listId = useId();
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const items = navigationForRole(role).flatMap(group => group.items.map(item => ({ ...item, group: group.label })))
    .filter(item => terms.every(term => `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(term)));
  const currentIndex = Math.min(activeIndex, Math.max(0, items.length - 1));
  const select = item => {
    onClose();
    navigate(item.to);
    requestAnimationFrame(() => document.getElementById("main-content")?.focus());
  };
  const onKeyDown = event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length);
      setActiveIndex(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && items[currentIndex]) {
      event.preventDefault();
      select(items[currentIndex]);
    }
  };

  return (
    <Modal title="Find a page" variant="center" onClose={onClose} footer={<><span>Navigate with arrow keys</span><span><kbd>Enter</kbd> open <kbd>Esc</kbd> close</span></>}>
      <div className="portal-command-search">
        <Search size={20} aria-hidden="true" />
        <input ref={input} autoFocus role="combobox" aria-label="Search pages" aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-activedescendant={items.length ? `${listId}-${currentIndex}` : undefined} value={query} placeholder="Search pages, reports, exports..." onChange={event => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={onKeyDown} />
      </div>
      <div className="portal-command-results" id={listId} role="listbox" aria-label="Pages">
        {items.map((item, index) => {
          const Icon = item.icon;
          return <div id={`${listId}-${index}`} key={item.to} role="option" aria-selected={index === currentIndex} className="portal-command-result" onMouseMove={() => setActiveIndex(index)} onClick={() => select(item)}>
            <span className="portal-command-icon"><Icon size={20} /></span>
            <div><span className="portal-command-label">{item.label}<small>{item.group}</small></span><p>{item.description}</p></div>
            <ArrowUpRight size={16} aria-hidden="true" />
          </div>;
        })}
      </div>
      {!items.length && <div role="status" className="portal-command-empty"><Search size={26} /><strong>No matching pages</strong><p>Try “reports”, “map” or “KPI”.</p><button type="button" className="portal-button" onClick={() => { setQuery(""); setActiveIndex(0); input.current?.focus(); }}>Clear search</button></div>}
      <p className="sr-only" role="status">{items.length} pages available</p>
    </Modal>
  );
}
