import React from "react";

const ToggleSwitch = ({
  enabled,
  onChange,
  label,
  description,
  activeColor = "bg-blue-500",
  Icon,
}) => {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-300 ${
        enabled
          ? "border-slate-600 bg-slate-800"
          : "border-slate-700 bg-slate-900"
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            className={`h-5 w-5 ${
              enabled ? "text-white" : "text-slate-400"
            }`}
          />
        )}

        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onChange}
        className={`relative h-7 w-14 rounded-full transition-all duration-300 ${
          enabled ? activeColor : "bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-all duration-300 ${
            enabled ? "left-8" : "left-1"
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;