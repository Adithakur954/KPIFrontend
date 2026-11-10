import { Suspense } from "react";
import { useLocation } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";

export default function PageBoundary({ children }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={
        <div role="status" aria-live="polite" className="min-h-64 p-6 text-slate-600">
          <p className="font-medium">Loading page...</p>
          <div aria-hidden="true" className="mt-5 space-y-4 motion-safe:animate-pulse">
            <div className="h-8 w-48 rounded bg-slate-200" />
            <div className="h-40 rounded-xl bg-slate-200/70" />
          </div>
        </div>
      }>{children}</Suspense>
    </ErrorBoundary>
  );
}
