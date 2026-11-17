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
        <Route path="/worstcell" element={<WorstCell />} />
        <Route path="/recommendation" element={<RcaPage />} />
        <Route path="/uploads" element={<UploadsPage />} />
        <Route path="/alarms" element={<AlarmsPage />} />
        <Route path="/sites" element={<SitesPage />} />
        <Route path="/threshold-rules" element={<ThresholdRulesPage />} />
        <Route path="/validation-report" element={<ValidationReportPage />} />
        <Route path="/local-license" element={<LocalLicensePage />} />
        <Route path="/admin" element={<AdminManagementPage />} />
        <Route path="/companies" element={<AdminManagementPage />} />
        <Route path="/licenses" element={<AdminManagementPage />} />
        <Route path="/accounts" element={<AdminManagementPage />} />
      </Route>

      {/* Catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
