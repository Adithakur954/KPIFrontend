import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X, LogOut, User, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import toolLogo from "@/assets/images/toolLogo.svg";
import { navigationForRole, findNavigationItem } from "@/shared/navigation/portalNavigation";

export default function Sidebar({ user, onLogout, loading, isCollapsed, setIsCollapsed, onOpenSearch }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef(null);
  const sidebar = useRef(null);
  const { pathname } = useLocation();
  const role = String(user?.role || "USER").toUpperCase();
  const groups = navigationForRole(role);
  const activeItem = findNavigationItem(pathname);
  const expanded = !isCollapsed || mobileMenuOpen;

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector("a")?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") { setMobileMenuOpen(false); menuButton.current?.focus(); }
      if (event.key !== "Tab") return;
      const elements = [...sidebar.current.querySelectorAll("a, button:not(:disabled)")].filter(el => el.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); };
  }, [mobileMenuOpen]);

  return <>
    <header className="portal-mobile-header lg:hidden">
      <button ref={menuButton} type="button" aria-label="Open navigation" aria-expanded={mobileMenuOpen} aria-controls="portal-navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={22} /></button>
      <img src={toolLogo} alt="" width="28" height="28" />
      <span>{activeItem?.label || "Network Monitor"}</span>
      <button type="button" className="ml-auto" aria-label="Find a page" onClick={onOpenSearch}><Search size={20} /></button>
    </header>
    {mobileMenuOpen && <div className="fixed inset-0 z-[80] bg-slate-950/40 lg:hidden" onClick={() => { setMobileMenuOpen(false); menuButton.current?.focus(); }} />}
    <aside ref={sidebar} id="portal-navigation" aria-label="Main navigation" className={`portal-sidebar fixed inset-y-0 left-0 z-[90] flex flex-col border-r border-slate-200 bg-white ${isCollapsed ? "w-64 lg:w-20" : "w-64"} ${mobileMenuOpen ? "translate-x-0" : "invisible -translate-x-full lg:visible lg:translate-x-0"}`}>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5">
        <img src={toolLogo} alt="Network Monitor" className="h-9 w-9 shrink-0" />
        <div className={expanded ? "min-w-0" : "hidden"}><p className="truncate text-sm font-bold text-slate-900">Network Monitor</p><p className="text-xs text-slate-500">Operations portal</p></div>
        <button type="button" aria-label="Close navigation" className="ml-auto lg:hidden" onClick={() => { setMobileMenuOpen(false); menuButton.current?.focus(); }}><X size={20} /></button>
      </div>
      <div className="portal-sidebar-search"><button type="button" aria-label="Find a page" title="Find a page (Ctrl+K)" onClick={() => { if (mobileMenuOpen) { setMobileMenuOpen(false); requestAnimationFrame(() => { menuButton.current?.focus(); onOpenSearch(); }); } else onOpenSearch(); }}><Search size={17} />{expanded && <><span>Find a page</span><kbd>Ctrl K</kbd></>}</button></div>
      <nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {groups.map(group => {
          const items = group.items;
          if (!items.length) return null;
          return <div key={group.label} className="portal-nav-group">
            {expanded && <p className="px-3 pb-2 pt-3 text-xs font-semibold tracking-wide text-slate-500">{group.label}</p>}
            {items.map(item => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} end={item.end} aria-label={item.label} title={item.label} onClick={() => { setMobileMenuOpen(false); if (mobileMenuOpen) requestAnimationFrame(() => document.getElementById("main-content")?.focus()); }} className={({ isActive }) => `portal-nav-link ${isActive ? "is-active" : ""} ${expanded ? "" : "justify-center"}`}>
              <Icon size={19} className="shrink-0" />{expanded && <span>{item.label}</span>}
            </NavLink>; })}
          </div>;
        })}
      </nav>
      <div className="space-y-1 border-t border-slate-200 p-3">
        {user && <div className="flex min-w-0 items-center gap-2 px-3 py-2 text-slate-600" title={user.email}><User size={18} className="shrink-0" />{expanded && <span className="truncate text-xs">{user.email}</span>}</div>}
        <button type="button" onClick={onLogout} disabled={loading} aria-label="Logout" title="Logout" className="portal-nav-link w-full text-slate-600 disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}{expanded && <span>{loading ? "Logging out..." : "Logout"}</span>}</button>
        <button type="button" onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="portal-nav-link hidden w-full justify-center lg:flex">{isCollapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse sidebar</span></>}</button>
      </div>
    </aside>
  </>;
}
