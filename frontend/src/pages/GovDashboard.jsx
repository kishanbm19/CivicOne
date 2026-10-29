import React, { useState, useEffect } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Plus,
  TrendingUp,
  PieChart as PieIcon,
  BarChart2,
  Bus,
  Building2,
  HeartPulse
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import StatCard from "../components/dashboard/StatCard";
import ComplaintTable from "../components/dashboard/ComplaintTable";
import { listComplaints } from "../services/complaints";
import { getDepartmentAnalytics } from "../services/services";
import { useAuth } from "../context/AuthContext";

export default function GovDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const outletCtx = useOutletContext() || {};
  const activeDomain = outletCtx.domain || "transport";

  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Department name & staff greeting defaults matching screenshot
  const domainConfig = {
    transport: {
      staffName: "Rajesh Kumar",
      deptTitle: "Transport Department • Staff",
      themeColor: "blue",
      btnClass: "bg-blue-600 hover:bg-blue-700",
      chart1Title: "Complaint Trends",
      chart2Title: "Top Categories",
      chartType: "line",
    },
    municipal: {
      staffName: "Priya Singh",
      deptTitle: "Municipal Department • Staff",
      themeColor: "green",
      btnClass: "bg-emerald-600 hover:bg-emerald-700",
      chart1Title: "Issue Trends",
      chart2Title: "Category Distribution",
      chartType: "bar",
    },
    healthcare: {
      staffName: "Dr. Amit Patel",
      deptTitle: "Healthcare Department • Staff",
      themeColor: "red",
      btnClass: "bg-rose-600 hover:bg-rose-700",
      chart1Title: "Facility-wise Complaints",
      chart2Title: "Issue Categories",
      chartType: "facility_bar",
    },
  };

  const currentCfg = domainConfig[activeDomain] || domainConfig.transport;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listComplaints({ domain: activeDomain, size: 4 }),
      getDepartmentAnalytics(activeDomain),
    ])
      .then(([compData, statData]) => {
        setComplaints(compData.items || []);
        setAnalytics(statData);
      })
      .catch((err) => {
        console.error("Dashboard data load error:", err);
      })
      .finally(() => setLoading(false));
  }, [activeDomain]);

  // Fallback data matching screenshot if database entries are loading
  const stats = analytics || {
    assigned_to_me: activeDomain === "transport" ? 24 : activeDomain === "municipal" ? 36 : 18,
    in_progress: activeDomain === "transport" ? 18 : activeDomain === "municipal" ? 22 : 12,
    resolved: activeDomain === "transport" ? 42 : activeDomain === "municipal" ? 65 : 28,
    overdue: activeDomain === "transport" ? 3 : activeDomain === "municipal" ? 5 : 4,
    trends: [
      { name: "Jan", count: 12 },
      { name: "Feb", count: 19 },
      { name: "Mar", count: 15 },
      { name: "Apr", count: 26 },
      { name: "May", count: 22 },
      { name: "Jun", count: 31 },
    ],
    category_distribution: [
      { name: "Bus Services", value: 40, color: "#2563EB" },
      { name: "Bus Stops", value: 25, color: "#0284C7" },
      { name: "Infrastructure", value: 20, color: "#0D9488" },
      { name: "Safety & Security", value: 15, color: "#E11D48" },
    ],
    facility_distribution: [
      { name: "Hospitals", count: 42 },
      { name: "PHCs", count: 65 },
      { name: "Clinics", count: 28 },
      { name: "Mobile Units", count: 14 },
    ],
  };

  // Switcher tab in demo mode to preview all 3 dashboards from screenshot
  return (
    <div className="space-y-8">
      {/* View Switcher Bar for Pair Programming / Demonstration */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Preview Domain Dashboards:
          </span>
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1">
            <button
              onClick={() => outletCtx.setActiveDomain?.("transport")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeDomain === "transport"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bus size={13} /> Transport
            </button>
            <button
              onClick={() => outletCtx.setActiveDomain?.("municipal")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeDomain === "municipal"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 size={13} /> Municipal
            </button>
            <button
              onClick={() => outletCtx.setActiveDomain?.("healthcare")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeDomain === "healthcare"
                  ? "bg-white text-rose-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <HeartPulse size={13} /> Healthcare
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Banner matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome, {user?.full_name || currentCfg.staffName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {currentCfg.deptTitle}
          </p>
        </div>
        <button
          onClick={() => navigate("/government/complaints/new")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-sm transition-all ${currentCfg.btnClass}`}
        >
          <Plus size={16} />
          <span>New Complaint</span>
        </button>
      </div>

      {/* 4 Metric KPI Cards matching screenshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Assigned to Me"
          value={stats.assigned_to_me}
          icon={Inbox}
          color="blue"
        />
        <StatCard
          title="In Progress"
          value={stats.in_progress}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertOctagon}
          color="red"
        />
      </div>

      {/* "My Assigned Complaints" Table matching screenshot */}
      <ComplaintTable
        complaints={complaints}
        title="My Assigned Complaints"
        viewAllLink={`/government/complaints?domain=${activeDomain}`}
      />

      {/* 2 Charts matching screenshot (Bottom row) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Line / Bar trend chart */}
        <div className="lg:col-span-7 card p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base">{currentCfg.chart1Title}</h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
              This Month
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {currentCfg.chartType === "line" ? (
                <LineChart data={stats.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Complaints"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#2563EB", strokeWidth: 2, stroke: "#ffffff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              ) : currentCfg.chartType === "bar" ? (
                <BarChart data={stats.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" name="Issues" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={stats.facility_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" name="Complaints" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Donut Distribution Chart */}
        <div className="lg:col-span-5 card p-5 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-base">{currentCfg.chart2Title}</h3>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.category_distribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(stats.category_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val}%`, name]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend items */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {(stats.category_distribution || []).map((cat) => (
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
