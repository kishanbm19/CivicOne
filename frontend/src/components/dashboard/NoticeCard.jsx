import React from "react";
import { Calendar, Tag, AlertCircle, FileText, CheckCircle2, Wrench } from "lucide-react";

export default function NoticeCard({
  title,
  description,
  date,
  badgeText,
  badgeType = "announcement",
  image = null,
  icon: Icon = null,
  onClick = null,
}) {
  const BADGE_COLORS = {
    announcement: "bg-blue-50 text-blue-700 border-blue-200",
    infrastructure: "bg-cyan-50 text-cyan-700 border-cyan-200",
    service_update: "bg-indigo-50 text-indigo-700 border-indigo-200",
    notice: "bg-emerald-50 text-emerald-700 border-emerald-200",
    alert: "bg-amber-50 text-amber-700 border-amber-200",
    health_camp: "bg-rose-50 text-rose-700 border-rose-200",
    facility_update: "bg-purple-50 text-purple-700 border-purple-200",
  };

  const badgeStyle = BADGE_COLORS[badgeType] || BADGE_COLORS.announcement;

  // If card has an image thumbnail (Transport & Healthcare style)
  if (image) {
    return (
      <div
        onClick={onClick}
        className="card overflow-hidden hover:shadow-elevated transition-all duration-200 cursor-pointer flex flex-col group border border-slate-200/80"
      >
        <div className="h-36 sm:h-40 w-full overflow-hidden relative bg-slate-100">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div className="absolute top-2.5 right-2.5">
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border shadow-sm ${badgeStyle}`}>
              {badgeText}
            </span>
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-blue-600 transition-colors">
              {title}
            </h4>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Calendar size={12} /> {date}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // List card style (Municipal style)
  return (
    <div
      onClick={onClick}
      className="card p-4 hover:shadow-elevated transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 border border-slate-200/80 group"
    >
      <div className="flex items-center gap-3.5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
          {Icon ? <Icon size={20} /> : <FileText size={20} />}
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
            {title}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Calendar size={11} /> {date}
          </p>
        </div>
      </div>
      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 border ${badgeStyle}`}>
        {badgeText}
      </span>
    </div>
  );
}
