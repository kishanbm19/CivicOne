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
import { BarChart3, TrendingUp, Clock, CheckCircle2, ShieldAlert, Inbox, Timer } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import {
  getDepartmentAnalytics,
  getPlatformAnalytics,
  listDepartmentSLAs,
  listDepartments,
  saveDepartmentSLA,
} from "../services/services";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../services/axios";

export default function GovAnalytics() {
  const { user, staffProfile } = useAuth();
  const outletCtx = useOutletContext() || {};
  const activeDomain = outletCtx.domain || "transport";
  const currentDepartment = outletCtx.currentDepartment;

  const [analytics, setAnalytics] = useState(null);
  const [platformMetrics, setPlatformMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [slaRows, setSlaRows] = useState([]);
  const [slaDepartment, setSlaDepartment] = useState(currentDepartment?.id || "");
  const [slaCategory, setSlaCategory] = useState("");
  const [slaHours, setSlaHours] = useState(72);
  const [slaError, setSlaError] = useState("");
  const [slaSaved, setSlaSaved] = useState(false);

  const loadSlaData = () => {
    Promise.all([listDepartments(), listDepartmentSLAs()])
      .then(([deptData, slaData]) => {
        setDepartments(deptData || []);
        setSlaRows(slaData || []);
        if (!slaDepartment && currentDepartment?.id) setSlaDepartment(currentDepartment.id);
        if (!slaDepartment && deptData?.length) setSlaDepartment(deptData[0].id);
      })
      .catch((err) => setSlaError(errMsg(err)));
  };

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

  useEffect(() => {
    loadSlaData();
  }, [currentDepartment?.id]);

  const trendsData = analytics?.trends || [];
  const categoryData = analytics?.category_distribution || [];

  const handleSaveSla = async (e) => {
    e.preventDefault();
    setSlaError("");
    setSlaSaved(false);
    try {
      await saveDepartmentSLA({
        department_id: slaDepartment,
        category: slaCategory,
        resolution_hours: Number(slaHours),
      });
      setSlaSaved(true);
      setSlaCategory("");
      loadSlaData();
      getDepartmentAnalytics(activeDomain).then(setAnalytics);
    } catch (err) {
      setSlaError(errMsg(err));
    }
  };

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
          title="Total Complaints"
          value={analytics?.total ?? 0}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Pending"
          value={analytics?.pending ?? 0}
          icon={Inbox}
          color="amber"
        />
        <StatCard
          title="In Progress"
          value={analytics?.in_progress ?? 0}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Resolved"
          value={analytics?.resolved ?? 0}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Assigned to Me"
          value={analytics?.assigned_to_me ?? 0}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Overdue"
          value={analytics?.overdue ?? 0}
          icon={ShieldAlert}
          color="red"
        />
        <StatCard
          title="Avg. Resolution (hrs)"
          value={analytics?.avg_resolution_hours ?? "—"}
          icon={Timer}
          color="green"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="card p-6 border border-slate-200">
            <h2 className="font-bold text-slate-900 mb-4">Staff Workload</h2>
            {analytics?.staff_workload?.length ? (
              <div className="space-y-3">
                {analytics.staff_workload.map((staff) => (
                  <div key={staff.user_id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{staff.staff_name}</span>
                    <span className="font-bold text-slate-900">{staff.open_complaints} open</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">No active assigned workload.</p>}
          </section>

          <section className="card p-6 border border-slate-200">
            <h2 className="font-bold text-slate-900 mb-4">Announcement Statistics</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>Drafts <strong className="float-right">{analytics?.announcement_stats?.draft ?? 0}</strong></p>
              <p>Pending approval <strong className="float-right">{analytics?.announcement_stats?.pending_approval ?? 0}</strong></p>
              <p>Published <strong className="float-right">{analytics?.announcement_stats?.published ?? 0}</strong></p>
              <p>Archived <strong className="float-right">{analytics?.announcement_stats?.archived ?? 0}</strong></p>
            </div>
          </section>

          <section className="card p-6 border border-slate-200 lg:col-span-2">
            <h2 className="font-bold text-slate-900 mb-4">Recent Department Activities</h2>
            {analytics?.recent_activities?.length ? (
              <div className="divide-y divide-slate-100">
                {analytics.recent_activities.map((activity, index) => (
                  <div key={`${activity.complaint_id}-${index}`} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-slate-700">{activity.summary}</span>
                     <span className="text-xs text-slate-500">
                      {activity.actor_name} · {new Date(activity.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">No recent complaint activity.</p>}
          </section>
        </div>

        {staffProfile?.permissions?.can_manage_staff && (
          <section className="card p-6 border border-slate-200 space-y-4">
            <div>
              <h2 className="font-bold text-slate-900">Service-Level Agreement Deadlines</h2>
              <p className="text-xs text-slate-500 mt-1">Set a resolution target for each department complaint category.</p>
            </div>
            <form onSubmit={handleSaveSla} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select
                value={slaDepartment}
                onChange={(e) => setSlaDepartment(e.target.value)}
                className="input"
                required
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
              <input
                value={slaCategory}
                onChange={(e) => setSlaCategory(e.target.value)}
                className="input"
                placeholder="Category key"
                required
                minLength={2}
              />
              <input
                type="number"
                value={slaHours}
                onChange={(e) => setSlaHours(e.target.value)}
                className="input"
                min="1"
                max="8760"
                required
                aria-label="Resolution hours"
              />
              <button type="submit" className="btn">Save SLA</button>
            </form>
            {slaError && <p role="alert" className="text-sm text-rose-700">{slaError}</p>}
            {slaSaved && <p className="text-sm text-emerald-700">SLA saved. New matching complaints receive the configured deadline.</p>}
            {slaRows.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {slaRows.map((sla) => (
                  <button
                    type="button"
                    key={sla.id}
                    onClick={() => {
                      setSlaDepartment(sla.department_id);
                      setSlaCategory(sla.category);
                      setSlaHours(sla.resolution_hours);
                    }}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700"
                  >
                    {sla.department_name} · {sla.category} · {sla.resolution_hours}h
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
