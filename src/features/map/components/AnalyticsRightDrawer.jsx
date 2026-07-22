import React from "react";
import { X } from "lucide-react";

export default function AnalyticsRightDrawer({
  open,
  onClose,
  title = "Analytics",
  subtitle,
  tabs = [],
  activeTab,
  onTabChange,
  children,
}) {
  return (
    <div
      className={`absolute inset-y-0 right-0 z-30 flex w-[460px] max-w-[94vw] flex-col border-l border-slate-800/80 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "translate-x-full pointer-events-none"
      }`}
    >
      <div className="border-b border-slate-800/80 px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black leading-tight tracking-tight text-white">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            title="Close analytics"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        {tabs.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange?.(tab.value)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                  activeTab === tab.value
                    ? "border border-blue-500/60 bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-950 p-4">{children}</div>
    </div>
  );
}

