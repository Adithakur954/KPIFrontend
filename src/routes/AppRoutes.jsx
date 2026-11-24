import { Routes, Route, Navigate } from "react-router-dom";
import { lazy } from "react";
import PageBoundary from "@/shared/components/common/PageBoundary";
import ProtectedRoute from "./ProtectedRoute";
import { pageLoaders } from "./pageLoaders";
const DashboardPage = lazy(pageLoaders.DashboardPage);
const MapPage = lazy(pageLoaders.MapPage);
const UploadsPage = lazy(pageLoaders.UploadsPage);
const WorstCell = lazy(pageLoaders.WorstCell);
const AlarmsPage = lazy(pageLoaders.AlarmsPage);
const SitesPage = lazy(pageLoaders.SitesPage);
const KpiView = lazy(pageLoaders.KpiView);
const RcaPage = lazy(pageLoaders.RcaPage);
const ThresholdRulesPage = lazy(pageLoaders.ThresholdRulesPage);
const ValidationReportPage = lazy(pageLoaders.ValidationReportPage);
const LoginPage = lazy(pageLoaders.LoginPage);
const AdminManagementPage = lazy(pageLoaders.AdminManagementPage);
const LocalLicensePage = lazy(pageLoaders.LocalLicensePage);
const ReportsPage = lazy(pageLoaders.ReportsPage);

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
