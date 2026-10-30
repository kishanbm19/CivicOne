import React, { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import StatCard from "../components/dashboard/StatCard";
import ComplaintTable from "../components/dashboard/ComplaintTable";
import { listComplaints } from "../services/complaints";
import { getDepartmentAnalytics } from "../services/services";
import { useAuth } from "../context/AuthContext";

export default function GovDashboard() {
  const { user } = useAuth();
  const outletCtx = useOutletContext() || {};
  const activeDomain = outletCtx.domain;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const departmentName = outletCtx.currentDepartment?.name;

  useEffect(() => {
    setLoading(true);
    setLoadError("");
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
        setLoadError("Dashboard information could not be loaded. Please try again later.");
      })
      .finally(() => setLoading(false));
  }, [activeDomain]);

  const stats = analytics || {
    total: 0,
    pending: 0,
    assigned_to_me: 0,
    in_progress: 0,
    resolved: 0,
    overdue: 0,
    trends: [],
    category_distribution: [],
  };
  const metricValue = (value) => (loading ? "…" : loadError ? "—" : value);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome{user?.full_name ? `, ${user.full_name}` : ""}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {departmentName || "Government operations"}
          </p>
        </div>
        <Link
          to="/government/complaints"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-brand hover:bg-brand-700 shadow-sm transition-all"
        >
          <Inbox size={16} />
          <span>Manage Complaints</span>
        </Link>
      </div>

      {loadError && (
        <p role="status" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 sm:gap-6">
        <StatCard
          title="Total Complaints"
          value={metricValue(stats.total)}
          icon={Inbox}
          color="blue"
        />
        <StatCard
          title="Pending"
          value={metricValue(stats.pending)}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Assigned to Me"
          value={metricValue(stats.assigned_to_me)}
          icon={Inbox}
          color="blue"
        />
        <StatCard
          title="In Progress"
          value={metricValue(stats.in_progress)}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Resolved"
          value={metricValue(stats.resolved)}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Overdue"
          value={metricValue(stats.overdue)}
          icon={AlertOctagon}
          color="red"
        />
      </div>

      <ComplaintTable
        complaints={complaints}
        title="Recent Department Complaints"
        viewAllLink={activeDomain ? `/government/complaints?domain=${activeDomain}` : "/government/complaints"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 card p-5 border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base">Complaint trends</h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
              Last 6 months
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 card p-5 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-base">Category distribution</h3>
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
