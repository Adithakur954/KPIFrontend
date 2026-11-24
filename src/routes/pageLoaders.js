// The router and navigation share import functions so an intentional hover can
// warm the same route chunk without mounting a page or starting its API requests.
export const pageLoaders = {
  DashboardPage: () => import('@/pages/DashboardPage'),
  MapPage: () => import('@/pages/MapPage'),
  UploadsPage: () => import('@/pages/UploadsPage'),
  WorstCell: () => import('@/pages/WorstCell'),
  AlarmsPage: () => import('@/pages/AlarmsPage'),
  SitesPage: () => import('@/pages/SitesPage'),
  KpiView: () => import('@/pages/KpiView'),
  RcaPage: () => import('@/pages/RecommendationPage'),
  ThresholdRulesPage: () => import('@/pages/ThresholdRulesPage'),
  ValidationReportPage: () => import('@/pages/ValidationReportPage'),
  LoginPage: () => import('@/pages/LoginPage'),
  AdminManagementPage: () => import('@/pages/AdminManagementPage'),
  LocalLicensePage: () => import('@/pages/LocalLicensePage'),
  ReportsPage: () => import('@/pages/ReportsPage'),
};
const routes = {
  '/': 'DashboardPage', '/map': 'MapPage', '/uploads': 'UploadsPage',
  '/worstcell': 'WorstCell', '/alarms': 'AlarmsPage', '/sites': 'SitesPage',
  '/kpi': 'KpiView', '/recommendation': 'RcaPage', '/threshold-rules': 'ThresholdRulesPage',
  '/validation-report': 'ValidationReportPage', '/admin': 'AdminManagementPage',
  '/local-license': 'LocalLicensePage', '/reports': 'ReportsPage',
};
export function preloadPage(path) {
  const connection = navigator.connection;
  if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType)) return;
  const load = pageLoaders[routes[path]];
  // A speculative import failure must not interrupt the current page; clicking
  // the route will use the router's normal error boundary.
  if (load) load().catch(() => {});
}
