import React from "react";

export default function StatCard({ title, value, icon: Icon, color = "blue", subtitle = null }) {
  const COLOR_MAP = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-100",
      ring: "ring-blue-500/20",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-100",
      ring: "ring-amber-500/20",
    },
    green: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-100",
      ring: "ring-emerald-500/20",
    },
    red: {
      bg: "bg-rose-50",
      text: "text-rose-600",
      border: "border-rose-100",
      ring: "ring-rose-500/20",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      border: "border-purple-100",
      ring: "ring-purple-500/20",
    },
  };

  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow duration-150">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`grid h-12 w-12 place-items-center rounded-2xl ${c.bg} ${c.text} shrink-0`}>
            <Icon size={22} />
          </div>
        )}
        <div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
            {value}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-1.5">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
