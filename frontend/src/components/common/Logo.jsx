import React from "react";
import { Link } from "react-router-dom";
import { Shield, Sparkles } from "lucide-react";

export default function Logo({ light = false, linkTo = "/", showTag = false, departmentTag = null }) {
  return (
    <Link to={linkTo} className="flex items-center gap-2.5 group">
      <div className={`grid h-8 w-8 place-items-center rounded-xl font-bold shadow-sm transition-transform group-hover:scale-105 ${
        light ? "bg-white text-slate-900" : "bg-blue-600 text-white"
      }`}>
        <Sparkles size={18} className="fill-current" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xl font-extrabold tracking-tight ${
            light ? "text-white" : "text-slate-900"
          }`}>
            Civic<span className={light ? "text-blue-300" : "text-blue-600"}>One</span>
          </span>
        </div>
        {departmentTag && (
          <span className="block text-[11px] font-semibold tracking-wide text-slate-300 uppercase">
            {departmentTag}
          </span>
        )}
      </div>
    </Link>
  );
}
