import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import QuickNavigation from "./QuickNavigation";
import { findNavigationItem } from "@/shared/navigation/portalNavigation";
import { useAuth } from "@/shared/context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

export default function MainLayout({ children }) {
  const { logout, user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("portal:sidebar") === "collapsed");
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const title = findNavigationItem(pathname)?.label || "Network Monitor";
    document.title = `${title} | Network Monitor`;
  }, [pathname]);
  useEffect(() => {
    const onKeyDown = event => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k" || event.altKey) return;
      if (!searchOpen && document.querySelector("dialog[open]")) return;
      if (document.body.style.overflow === "hidden" && !searchOpen) return;
      event.preventDefault();
      setSearchOpen(previous => !previous);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);
  const toggleSidebar = (value) => {
    setIsCollapsed(value);
    localStorage.setItem("portal:sidebar", value ? "collapsed" : "expanded");
  };
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  return (
    <div className="portal-shell min-h-screen" data-map-page={pathname === "/map"}>
      <a href="#main-content" className="portal-skip-link">Skip to content</a>
      <Sidebar user={user} onLogout={handleLogout} loading={loading} isCollapsed={isCollapsed} setIsCollapsed={toggleSidebar} onOpenSearch={() => setSearchOpen(true)} />
      {searchOpen && <QuickNavigation role={user?.role} onClose={() => setSearchOpen(false)} />}
      <main id="main-content" tabIndex={-1} className={`portal-main min-h-screen ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        {children}
      </main>
    </div>
  );
}
