import { AlertCircle, Database, Loader2 } from "lucide-react";

export default function PageState({ title, children, variant = "empty", action }) {
  const Icon = variant === "error" ? AlertCircle : variant === "loading" ? Loader2 : Database;
  return <div className={`portal-page-state portal-page-state-${variant}`} role={variant === "error" ? "alert" : "status"}>
    <span className="portal-state-icon"><Icon size={24} className={variant === "loading" ? "animate-spin" : undefined} aria-hidden="true" /></span>
    <div><p className="portal-state-title">{title}</p>{children && <div className="portal-state-description">{children}</div>}{action && <div className="mt-3">{action}</div>}</div>
  </div>;
}
