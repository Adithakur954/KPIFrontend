import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "@/pages/DashboardPage";
import MapPage from "@/pages/MapPage";
import UploadsPage from "@/pages/UploadsPage";
import WorstCell from "@/pages/WorstCell";
import AlarmsPage from "@/pages/AlarmsPage";
import SitesPage from "@/pages/SitesPage";
import KpiView from "@/pages/KpiView";
import RcaPage from "@/pages/RecommendationPage";
import ThresholdRulesPage from "@/pages/ThresholdRulesPage";
import ValidationReportPage from "@/pages/ValidationReportPage";
import LoginPage from "@/pages/LoginPage";
import AdminManagementPage from "@/pages/AdminManagementPage";
import LocalLicensePage from "@/pages/LocalLicensePage";
import ProtectedRoute from "./ProtectedRoute";
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
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes - All wrapped in MainLayout via ProtectedRoute */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/kpi" element={<KpiView />} />
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
