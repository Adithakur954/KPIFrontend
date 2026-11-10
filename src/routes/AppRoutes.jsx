import { Routes, Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import PageBoundary from "@/shared/components/common/PageBoundary";
import ProtectedRoute from "./ProtectedRoute";
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const MapPage = lazy(() => import("@/pages/MapPage"));
const UploadsPage = lazy(() => import("@/pages/UploadsPage"));
const WorstCell = lazy(() => import("@/pages/WorstCell"));
const AlarmsPage = lazy(() => import("@/pages/AlarmsPage"));
const SitesPage = lazy(() => import("@/pages/SitesPage"));
const KpiView = lazy(() => import("@/pages/KpiView"));
const RcaPage = lazy(() => import("@/pages/RecommendationPage"));
const ThresholdRulesPage = lazy(() => import("@/pages/ThresholdRulesPage"));
const ValidationReportPage = lazy(() => import("@/pages/ValidationReportPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const AdminManagementPage = lazy(() => import("@/pages/AdminManagementPage"));
const LocalLicensePage = lazy(() => import("@/pages/LocalLicensePage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
import { useAuth } from "@/shared/context/AuthContext";

function RequireRole({ allowedRoles, children }) {
  const { user } = useAuth();
  const role = String(user?.role || "USER").toUpperCase();
  return allowedRoles.includes(role) ? children : <Navigate to="/" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<PageBoundary><LoginPage /></PageBoundary>} />

      {/* Protected Routes - All wrapped in MainLayout via ProtectedRoute */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/kpi" element={<KpiView />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/worstcell" element={<RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}><WorstCell /></RequireRole>} />
        <Route path="/recommendation" element={<RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}><RcaPage /></RequireRole>} />
        <Route path="/uploads" element={<RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}><UploadsPage /></RequireRole>} />
        <Route path="/alarms" element={<RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}><AlarmsPage /></RequireRole>} />
        <Route path="/sites" element={<RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}><SitesPage /></RequireRole>} />
        <Route path="/threshold-rules" element={<RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}><ThresholdRulesPage /></RequireRole>} />
        <Route path="/validation-report" element={<RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}><ValidationReportPage /></RequireRole>} />
        <Route path="/local-license" element={<RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}><LocalLicensePage /></RequireRole>} />
        <Route path="/admin" element={<RequireRole allowedRoles={["SUPER_ADMIN"]}><AdminManagementPage /></RequireRole>} />
        <Route path="/companies" element={<RequireRole allowedRoles={["SUPER_ADMIN"]}><AdminManagementPage /></RequireRole>} />
        <Route path="/licenses" element={<RequireRole allowedRoles={["SUPER_ADMIN"]}><AdminManagementPage /></RequireRole>} />
        <Route path="/accounts" element={<RequireRole allowedRoles={["SUPER_ADMIN"]}><AdminManagementPage /></RequireRole>} />
      </Route>

      {/* Catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
