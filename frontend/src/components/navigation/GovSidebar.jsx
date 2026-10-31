import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  FileText,
  BarChart3,
  Users,
  Settings,
  ShieldAlert,
  LogOut,
  Layers
} from "lucide-react";
import Logo from "../common/Logo";
import { useAuth } from "../../context/AuthContext";

export default function GovSidebar({ domain = "transport", onNewComplaintClick = null }) {
  const { user, staffProfile, signOut } = useAuth();
  const location = useLocation();

  // Dynamic theme styling matching screenshot sidebars
  const THEMES = {
    transport: {
      bg: "bg-[#0B192C]",
      tagText: "Transport Department",
      tagBg: "bg-blue-950/80 text-blue-300 border-blue-800/40",
      activeBg: "bg-blue-600/30 text-white font-semibold border-l-4 border-blue-500",
      hoverBg: "hover:bg-slate-800/50 hover:text-white",
    },
    municipal: {
      bg: "bg-[#064e3b]",
      tagText: "Municipal Department",
      tagBg: "bg-emerald-950/80 text-emerald-300 border-emerald-800/40",
      activeBg: "bg-emerald-600/30 text-white font-semibold border-l-4 border-emerald-400",
      hoverBg: "hover:bg-emerald-900/40 hover:text-white",
    },
    healthcare: {
      bg: "bg-[#450a0a]",
      tagText: "Healthcare Department",
      tagBg: "bg-rose-950/80 text-rose-300 border-rose-800/40",
      activeBg: "bg-rose-600/30 text-white font-semibold border-l-4 border-rose-400",
      hoverBg: "hover:bg-rose-900/40 hover:text-white",
    },
  };

  const currentTheme = THEMES[domain] || THEMES.transport;
  const isPlatformAdmin = user?.role === "platform_admin";

  return (
    <aside className={`w-64 min-h-screen ${currentTheme.bg} text-slate-300 flex flex-col justify-between select-none shadow-xl transition-colors duration-300`}>
      <div className="p-5">
        {/* Logo and Department Tag */}
        <div className="pb-4 border-b border-white/10">
          <Logo light linkTo="/government" />
          <div className="mt-3">
            <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${currentTheme.tagBg}`}>
              {currentTheme.tagText}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="mt-5 space-y-1 text-sm font-medium">
          {/* Dashboard */}
          <Link
            to={isPlatformAdmin ? "/government/analytics" : "/government"}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              location.pathname === "/government"
                ? currentTheme.activeBg
                : `text-slate-300 ${currentTheme.hoverBg}`
            }`}
          >
            <LayoutDashboard size={18} />
            <span>{isPlatformAdmin ? "System Overview" : "Dashboard"}</span>
          </Link>

          {/* Complaints Group */}
          {!isPlatformAdmin && <div className="pt-3">
            <p className="px-3 text-[11px] font-bold tracking-wider uppercase text-slate-400/80 mb-1">
              Complaints
            </p>
            <Link
              to="/government/complaints?filter=assigned_to_me"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs ${
                location.search.includes("assigned_to_me")
                  ? currentTheme.activeBg
                  : `text-slate-300 ${currentTheme.hoverBg}`
              }`}
            >
              <Inbox size={16} />
              <span>Assigned to Me</span>
            </Link>
            <Link
              to="/government/complaints"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs ${
                location.pathname === "/government/complaints" && !location.search.includes("assigned_to_me")
                  ? currentTheme.activeBg
                  : `text-slate-300 ${currentTheme.hoverBg}`
              }`}
            >
              <CheckSquare size={16} />
              <span>All Complaints</span>
            </Link>
          </div>}

          {/* Domain Services */}
          <div className="pt-3">
            <p className="px-3 text-[11px] font-bold tracking-wider uppercase text-slate-400/80 mb-1">
              Operations
            </p>
            {!isPlatformAdmin && (
              <Link
                to="/government/documents"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs ${
                  location.pathname.startsWith("/government/documents")
                    ? currentTheme.activeBg
                    : `text-slate-300 ${currentTheme.hoverBg}`
                }`}
              >
                <FileText size={16} />
                <span>Notices & Updates</span>
              </Link>
            )}
            <Link
              to="/government/analytics"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs ${
                location.pathname === "/government/analytics"
                  ? currentTheme.activeBg
                  : `text-slate-300 ${currentTheme.hoverBg}`
              }`}
            >
              <BarChart3 size={16} />
              <span>Analytics</span>
            </Link>
          </div>

          {/* Administration (for Dept & Platform Admin) */}
          {staffProfile?.permissions?.can_manage_staff && (
            <div className="pt-3">
              <p className="px-3 text-[11px] font-bold tracking-wider uppercase text-slate-400/80 mb-1">
                Administration
              </p>
              <Link
                to="/government/staff"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs ${
                  location.pathname === "/government/staff"
                    ? currentTheme.activeBg
                    : `text-slate-300 ${currentTheme.hoverBg}`
                }`}
              >
                <Users size={16} />
                <span>Staff Management</span>
              </Link>
              {user?.role === "platform_admin" && (
                <Link
                  to="/government/admin/organizations"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs ${
                    location.pathname.includes("/admin/organizations")
                      ? currentTheme.activeBg
                      : `text-slate-300 ${currentTheme.hoverBg}`
                  }`}
                >
                  <Layers size={16} />
                  <span>Organizations</span>
                </Link>
              )}
              <Link
                to="/government/audit-logs"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs ${
                  location.pathname === "/government/audit-logs"
                    ? currentTheme.activeBg
                    : `text-slate-300 ${currentTheme.hoverBg}`
                }`}
              >
                <ShieldAlert size={16} />
                <span>Audit Logs</span>
              </Link>
            </div>
          )}

          {/* Settings */}
          <div className="pt-3">
            <Link
              to="/government/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-xs ${
                location.pathname === "/government/settings"
                  ? currentTheme.activeBg
                  : `text-slate-300 ${currentTheme.hoverBg}`
              }`}
            >
              <Settings size={16} />
              <span>Settings</span>
            </Link>
          </div>
        </nav>
      </div>

      {/* Footer Profile & Sign Out */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white font-bold text-xs shrink-0">
              {(user?.full_name || "Staff")[0]}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user?.full_name}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role?.replace("_", " ")}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
