import React from "react";

const STATUS_STYLES = {
  submitted: "bg-slate-100 text-slate-700 border-slate-200",
  classified: "bg-cyan-50 text-cyan-700 border-cyan-200",
  assigned: "bg-blue-50 text-blue-600 border-blue-200",
  acknowledged: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_progress: "bg-blue-50 text-blue-600 border-blue-200",
  on_hold: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  reopened: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function StatusBadge({ status }) {
  const norm = (status || "submitted").toLowerCase();
  const label = norm.replace("_", " ");
  const style = STATUS_STYLES[norm] || STATUS_STYLES.submitted;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${style}`}>
      {label}
    </span>
  );
}
