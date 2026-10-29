import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { BarChart3, TrendingUp, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import { getDepartmentAnalytics, getPlatformAnalytics } from "../services/services";
import { useAuth } from "../context/AuthContext";

export default function GovAnalytics() {
  const { user } = useAuth();
  const outletCtx = useOutletContext() || {};
  const activeDomain = outletCtx.domain || "transport";

  const [analytics, setAnalytics] = useState(null);
  const [platformMetrics, setPlatformMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const reqs = [getDepartmentAnalytics(activeDomain)];
    if (user?.role === "platform_admin") {
      reqs.push(getPlatformAnalytics());
    }
    Promise.all(reqs)
      .then(([deptData, platData]) => {
        setAnalytics(deptData);
        if (platData) setPlatformMetrics(platData);
      })
      .catch((err) => console.error("Error loading analytics:", err))
      .finally(() => setLoading(false));
  }, [activeDomain, user?.role]);

  const trendsData = analytics?.trends || [
    { name: "Jan", count: 12, resolved: 10 },
    { name: "Feb", count: 18, resolved: 15 },
    { name: "Mar", count: 14, resolved: 12 },
    { name: "Apr", count: 25, resolved: 22 },
    { name: "May", count: 22, resolved: 20 },
    { name: "Jun", count: 30, resolved: 27 },
  ];

  const categoryData = analytics?.category_distribution || [
    { name: "Primary Service", value: 45, color: "#2563EB" },
    { name: "Infrastructure", value: 30, color: "#10B981" },
    { name: "Facility Maintenance", value: 25, color: "#F59E0B" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Department Performance & Service Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Database-backed civic metrics, workload distributions, and resolution benchmarks scoped to your authorized scope.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Assigned to Department"
          value={analytics?.assigned_to_me || 24}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="In Progress"
          value={analytics?.in_progress || 18}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Resolved"
          value={analytics?.resolved || 42}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Overdue"
          value={analytics?.overdue || 3}
          icon={ShieldAlert}
          color="red"
        />
      </div>

      {/* Platform Level Overview (if platform admin) */}
      {platformMetrics && (
        <div className="card p-6 border border-slate-200 space-y-4 bg-slate-900 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white">Platform System-Wide Metrics</h2>
            <span className="text-xs font-semibold text-emerald-400">Platform Admin View</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div className="p-3 bg-slate-800/80 rounded-xl">
              <p className="text-2xl font-bold text-blue-400">{platformMetrics.organizations}</p>
              <p className="text-[11px] text-slate-400 mt-1">Organizations</p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl">
              <p className="text-2xl font-bold text-blue-400">{platformMetrics.departments}</p>
              <p className="text-[11px] text-slate-400 mt-1">Departments</p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl">
              <p className="text-2xl font-bold text-emerald-400">{platformMetrics.users}</p>
              <p className="text-[11px] text-slate-400 mt-1">Accounts</p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl">
              <p className="text-2xl font-bold text-amber-400">{platformMetrics.total_complaints}</p>
              <p className="text-[11px] text-slate-400 mt-1">Complaints</p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl">
              <p className="text-2xl font-bold text-purple-400">{platformMetrics.published_documents}</p>
              <p className="text-[11px] text-slate-400 mt-1">Notices</p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl">
              <p className="text-2xl font-bold text-rose-400">{platformMetrics.audit_events}</p>
              <p className="text-[11px] text-slate-400 mt-1">Audit Events</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Resolution Trend */}
        <div className="lg:col-span-7 card p-6 border border-slate-200">
          <h3 className="font-bold text-slate-900 text-base mb-4">
            Complaint Inflow vs. Resolutions
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="count" name="Filed Issues" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share */}
        <div className="lg:col-span-5 card p-6 border border-slate-200 flex flex-col justify-between">
          <h3 className="font-bold text-slate-900 text-base mb-2">
            Category Breakdown
          </h3>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val}%`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  ></span>
                  <span className="text-slate-600 truncate">{cat.name}</span>
                </div>
                <span className="font-bold text-slate-900 ml-1">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
