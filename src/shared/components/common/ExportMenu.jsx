import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";

export default function ExportMenu({ items, busy = false }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = event => { if (!container.current?.contains(event.target)) setOpen(false); };
    const onKey = event => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return <div ref={container} className="portal-export-menu">
    <button ref={trigger} type="button" className="portal-button portal-button-primary" aria-expanded={open} disabled={busy} onClick={() => setOpen(value => !value)}>
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{busy ? "Preparing export..." : "Export"}<ChevronDown size={15} />
    </button>
    {open && <div className="portal-export-options" role="group" aria-label="Export formats">
      <p>Choose report format</p>
      {items.map(item => <button key={item.label} type="button" disabled={item.disabled} onClick={() => { setOpen(false); trigger.current?.focus(); item.onSelect(); }}>{item.label}<small>{item.description}</small></button>)}
    </div>}
  </div>;
}
