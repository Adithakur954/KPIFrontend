import {
  LayoutDashboard, BarChart3, Map, AlertTriangle, Lightbulb, Upload, Bell,
  Radio, SlidersHorizontal, FileCheck, FileBarChart, UserPlus, ShieldCheck,
} from "lucide-react";

// Sidebar, quick navigation and document titles share this display registry.
// Authorization remains enforced by route guards and the backend.
export const portalNavigation = [
  { label: "Monitoring", items: [
    { to: "/", label: "Dashboard", description: "Network overview and KPI threshold status", icon: LayoutDashboard, end: true },
    { to: "/kpi", label: "KPI Analytics", description: "Charts, trends, filters and Excel exports", icon: BarChart3 },
    { to: "/map", label: "Coverage Map", description: "Sites, cells, coverage and spatial analysis", icon: Map },
    { to: "/alarms", label: "Alarms", description: "Review and manage network alarms", icon: Bell },
    { to: "/alarm-operations", label: "Alarm Operations", description: "Native OSS imports, evidence, customer catalogue and delivery", icon: FileCheck },
  ] },
  { label: "Analysis", items: [
    { to: "/worstcell", label: "Worst Cell Analysis", description: "Find persistent failures and compare periods", icon: AlertTriangle },
    { to: "/recommendation", label: "Root Cause Analysis", description: "RCA, causes, evidence and recommendations", icon: Lightbulb },
    { to: "/reports", label: "Daily Reports", description: "Daily comparisons, downloads, email and automation", icon: FileBarChart },
    { to: "/validation-report", label: "Validation Report", description: "Inspect data validation results", icon: FileCheck },
  ] },
  { label: "Administration", items: [
    { to: "/uploads", label: "Uploads", description: "Import data and inspect processing history", icon: Upload },
    { to: "/sites", label: "Sites", description: "Explore site inventory and analytics", icon: Radio },
    { to: "/threshold-rules", label: "Threshold Rules", description: "Configure KPI limits and operators", icon: SlidersHorizontal },
    { to: "/local-license", label: "Local License", description: "Inspect local license status", icon: ShieldCheck },
    { to: "/admin", label: "Admin Management", description: "Manage users and company access", icon: UserPlus },
  ] },
];

export function navigationForRole(role = "USER") {
  const normalizedRole = String(role || "USER").toUpperCase();
  return portalNavigation
    .map(group => ({ ...group, items: group.items.filter(item => !item.roles || item.roles.includes(normalizedRole)) }))
    .filter(group => group.items.length);
}

export function findNavigationItem(pathname) {
  return portalNavigation.flatMap(group => group.items).find(item => item.to === pathname);
}
