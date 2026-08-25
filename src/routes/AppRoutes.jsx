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
import CreateAccountPage from "@/pages/CreateAccountPage";
import ProtectedRoute from "./ProtectedRoute";

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
        <Route path="/worstcell" element={<WorstCell />} />
        <Route path="/recommendation" element={<RcaPage />} />
        <Route path="/uploads" element={<UploadsPage />} />
        <Route path="/alarms" element={<AlarmsPage />} />
        <Route path="/sites" element={<SitesPage />} />
        <Route path="/threshold-rules" element={<ThresholdRulesPage />} />
        <Route path="/validation-report" element={<ValidationReportPage />} />
        <Route path="/accounts" element={<CreateAccountPage />} />
      </Route>

      {/* Catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
