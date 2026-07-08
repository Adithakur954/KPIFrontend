import React from "react";
import { X } from "lucide-react";

export default function AnalyticsRightDrawer({ open, onClose, title = "Analytics", subtitle, children }) {
  return (
    <div
      className={`absolute inset-y-0 right-0 z-30 flex w-[460px] max-w-[94vw] flex-col border-l border-slate-800 bg-slate-950 shadow-2xl transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "translate-x-full pointer-events-none"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 text-white">
        <div>
          <h2 className="text-xl font-black leading-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"
          title="Close analytics"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4">{children}</div>
    </div>
  );
}
