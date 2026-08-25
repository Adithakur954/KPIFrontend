import { BrowserRouter, HashRouter } from "react-router-dom";
import AppRoutes from "@/routes/AppRoutes";
import AppProviders from "./AppProviders";

export default function App() {
  const isElectron =
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("electron");
  const Router = isElectron ? HashRouter : BrowserRouter;

  return (
    <Router>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </Router>
  );
}
