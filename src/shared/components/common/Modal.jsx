import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/** Native modal: focus containment, Escape dismissal and focus restoration. */
export default function Modal({ title, onClose, children, variant = "drawer", footer }) {
  const dialog = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const closeFromBackdrop = event => {
    if (event.target !== dialog.current) return;
    const bounds = dialog.current.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  };

  return (
    <dialog ref={dialog} aria-modal="true" aria-labelledby={titleId} className={variant === "drawer" ? "portal-detail-dialog" : "portal-command-dialog"} onCancel={onClose} onClick={closeFromBackdrop}>
      <header>
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="portal-button" aria-label={variant === "drawer" ? "Close details" : "Close page search"} onClick={onClose}><X size={18} /></button>
      </header>
      <div className={variant === "drawer" ? "portal-detail-body" : "portal-command-body"}>{children}</div>
      {footer && <footer>{footer}</footer>}
    </dialog>
  );
}
