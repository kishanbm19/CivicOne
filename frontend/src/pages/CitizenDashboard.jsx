import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Inbox,
  Clock,
  CheckCircle2,
  Bus,
  Building2,
  HeartPulse,
  Plus,
  ArrowRight,
  ChevronRight,
  Shield,
  Bell,
  Calendar,
  AlertCircle
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import PriorityBadge from "../components/common/PriorityBadge";
import { listComplaints } from "../api/complaints";
import { getCitizenAnalytics } from "../api/services";
import { listPublicDocuments } from "../api/documents";
import { useAuth } from "../context/AuthContext";

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, in_progress: 0, resolved: 0 });
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listComplaints({ size: 5 }),
      getCitizenAnalytics(),
      listPublicDocuments({ size: 3 }),
    ])
      .then(([cData, sData, nData]) => {
        setComplaints(cData.items || []);
        setStats(sData || { total: 0, in_progress: 0, resolved: 0 });
        setNotices(nData.items || []);
      })
      .catch((err) => {
        console.error("Citizen dashboard data error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const serviceButtons = [
    {
      domain: "transport",
      title: "Transport Services",
      desc: "Bus delays, shelters & roads",
      icon: Bus,
      bg: "bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 text-blue-900",
      btnClass: "bg-blue-600 hover:bg-blue-700 text-white",
      link: "/services/transport",
      reportLink: "/app/complaints/new?domain=transport",
    },
    {
      domain: "municipal",
      title: "Municipal Services",
      desc: "Waste, potholes & streetlights",
      icon: Building2,
      bg: "bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200 text-emerald-900",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
      link: "/services/municipal",
      reportLink: "/app/complaints/new?domain=municipal",
    },
    {
      domain: "healthcare",
      title: "Healthcare Services",
      desc: "Clinics, equipment & cleanliness",
      icon: HeartPulse,
      bg: "bg-rose-50/70 hover:bg-rose-100/70 border-rose-200 text-rose-900",
      btnClass: "bg-rose-600 hover:bg-rose-700 text-white",
      link: "/services/healthcare",
      reportLink: "/app/complaints/new?domain=healthcare",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2">
            Citizen Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome, {user?.full_name || "Ananya Sharma"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your civic complaints and access unified public services through one secure digital identity.
          </p>
        </div>
        <Link
          to="/app/complaints/new"
          className="btn px-5 py-3 text-sm font-semibold whitespace-nowrap shadow-md self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Total Complaints Filed"
          value={stats.total}
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
      </div>

      {/* Quick Service Gateways */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Access City Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {serviceButtons.map((svc) => {
            const Icon = svc.icon;
            return (
              <div
                key={svc.domain}
                className={`card p-5 border ${svc.bg} transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm shrink-0">
                      <Icon size={20} className="text-slate-800" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{svc.title}</h3>
                      <p className="text-xs text-slate-500">{svc.desc}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                  <Link
                    to={svc.link}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                  >
                    Explore Portal <ChevronRight size={14} />
                  </Link>
                  <Link
                    to={svc.reportLink}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${svc.btnClass} shadow-sm`}
                  >
                    Report Issue
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Complaints Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Complaints</h2>
            <p className="text-xs text-slate-500">Track real-time progress and resolutions</p>
          </div>
          <Link
            to="/app/complaints"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
          >
            View All History <ChevronRight size={14} />
          </Link>
        </div>

        <div className="card overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                      You haven't filed any complaints yet. Report an issue above to start tracking.
                    </td>
                  </tr>
                ) : (
                  complaints.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/app/complaints/${c.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 text-xs">
                        {c.reference}
                      </td>
                      <td className="py-3.5 px-4 font-medium capitalize text-slate-600">
                        {c.domain}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {c.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {c.locality || c.address?.split(",")[0] || "Civic Area"}
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold text-blue-600 hover:underline">
                          Details →
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Published Circulars & Consent Quick Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card p-6 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">Latest Verified Public Notices</h3>
            <Link to="/app/notices" className="text-xs font-semibold text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {notices.map((n) => (
              <div key={n.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded mr-2">
                    {n.service_domain}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900">{n.title}</span>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{n.description}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                  <Calendar size={12} /> {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Consent and Security Card */}
        <div className="card p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-emerald-400">
              <Shield size={20} />
            </div>
            <h3 className="font-bold text-lg text-white">Privacy & Consent Controls</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your digital identity is isolated across domains. You control exactly which organizations can view your synthetic profile and healthcare records.
            </p>
          </div>
          <div className="pt-4">
            <Link
              to="/app/consent"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 shadow transition-colors"
            >
              Manage Consents <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
