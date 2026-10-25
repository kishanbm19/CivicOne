import React from "react";

const PRIORITY_STYLES = {
  critical: "bg-red-50 text-red-700 border-red-200",
  high: "bg-rose-50 text-rose-600 border-rose-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function PriorityBadge({ priority }) {
  const norm = (priority || "medium").toLowerCase();
  const style = PRIORITY_STYLES[norm] || PRIORITY_STYLES.medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize border ${style}`}>
      {norm}
    </span>
  );
}
