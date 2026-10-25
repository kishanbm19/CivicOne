import React, { useState } from "react";
import { Search, Bell, ChevronDown, Building, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function GovTopBar({ onSearch = null, domain = "transport", currentDepartment = null, onSelectDepartment = null }) {
  const { user, staffProfile, unreadCount } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  // Staff title and avatar display based on current user / domain
  const staffRoleLabel = domain === "transport"
    ? "Transport Staff"
    : domain === "healthcare"
    ? "Healthcare Staff"
    : "Municipal Staff";

  const departments = staffProfile?.departments || [];

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shadow-subtle sticky top-0 z-20">
      {/* Search Input */}
      <div className="relative w-72 sm:w-96">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchValue}
          onChange={handleSearchChange}
          placeholder="Search Services..."
          className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Department Context Selector (if multi-dept or admin) */}
        {departments.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowDeptDropdown(!showDeptDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
            >
              <Building size={14} className="text-slate-500" />
              <span>{currentDepartment?.name || "All Departments"}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            {showDeptDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-elevated border border-slate-100 py-1.5 z-50">
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Department
                </p>
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => {
                      if (onSelectDepartment) onSelectDepartment(dept);
                      setShowDeptDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>{dept.name}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{dept.organization_domain}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            )}
          </button>
        </div>

        {/* User Profile Badge from screenshot */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {user?.full_name || "Staff Member"}
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              {user?.role === "platform_admin" ? "Platform Administrator" : staffRoleLabel}
            </p>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white font-bold text-sm shadow-sm ring-2 ring-slate-100">
            {(user?.full_name || "S")[0]}
          </div>
        </div>
      </div>
    </header>
  );
}
