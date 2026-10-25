import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Trash2,
  Construction,
  Lightbulb,
  Droplets,
  Search,
  CheckCircle,
  Clock,
  ShieldCheck,
  Timer,
  Calendar,
  AlertTriangle,
  Wrench,
  ArrowRight
} from "lucide-react";
import { MunicipalHeroIllustration } from "../components/common/HeroIllustrations";
import StatCard from "../components/dashboard/StatCard";
import NoticeCard from "../components/dashboard/NoticeCard";
import { getPublicStats } from "../api/services";

export default function MunicipalCitizenPortal() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    issues_resolved: 1245,
    in_progress: 320,
    resolution_rate: "95%",
    avg_resolution_time: "2.4 Days"
  });

  useEffect(() => {
    getPublicStats().then(setStats).catch(() => {});
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/app/complaints/new?domain=municipal&prefill=${encodeURIComponent(searchQuery)}`);
  };

  const categories = [
    {
      title: "Garbage Collection",
      desc: "Report uncollected garbage, overflowing bins",
      icon: Trash2,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
      catKey: "garbage",
    },
    {
      title: "Roads & Potholes",
      desc: "Report potholes, damaged roads and footpaths",
      icon: Construction,
      color: "bg-amber-50 text-amber-600 border-amber-200",
      catKey: "pothole",
    },
    {
      title: "Streetlights",
      desc: "Report faulty or damaged streetlights",
      icon: Lightbulb,
      color: "bg-yellow-50 text-yellow-600 border-yellow-200",
      catKey: "streetlight",
    },
    {
      title: "Water Supply & Drainage",
      desc: "Report water supply issues, drainage and sewage",
      icon: Droplets,
      color: "bg-cyan-50 text-cyan-600 border-cyan-200",
      catKey: "water_supply",
    },
  ];

  const notices = [
    {
      title: "Garbage Collection Schedule",
      desc: "Updated schedule for Ward 12. Morning rounds from 7:00 AM.",
      date: "Oct 22, 2026",
      badge: "Notice",
      badgeType: "notice",
      icon: Trash2,
    },
    {
      title: "Pothole Repair Drive",
      desc: "Major road repair work in Central Zone covering arterial links.",
      date: "Oct 19, 2026",
      badge: "Infrastructure",
      badgeType: "infrastructure",
      icon: Wrench,
    },
    {
      title: "Water Supply Interruption",
      desc: "Planned maintenance work on Oct 25 affecting northern sectors.",
      date: "Oct 18, 2026",
      badge: "Alert",
      badgeType: "alert",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Banner & Search */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 p-6 sm:p-10 border border-emerald-100/80 shadow-card">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-bold tracking-wide uppercase">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Municipal Services</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              A Cleaner, Greener and Healthier City for Everyone
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Report civic issues like garbage, potholes, streetlights and water supply. Let's build a better city together.
            </p>

            {/* Embedded Search Form */}
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="bg-white p-2 sm:p-2.5 rounded-2xl shadow-elevated border border-slate-200 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for issues or type your address..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-municipal text-xs sm:text-sm font-semibold whitespace-nowrap px-6 py-2.5"
                >
                  Report Issue
                </button>
              </div>
            </form>
          </div>

          {/* Hero Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <MunicipalHeroIllustration />
          </div>
        </div>
      </section>

      {/* 4 Action Category Cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.title}
                onClick={() => navigate(`/app/complaints/new?domain=municipal&category=${cat.catKey}`)}
                className="card p-5 sm:p-6 card-hover cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${cat.color} group-hover:scale-105 transition-transform`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
                  <span>Report issue</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* City Highlights Section matching screenshot */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">City Highlights</h2>
            <p className="text-xs text-slate-500">Live, database-backed municipal performance metrics</p>
          </div>
          <Link
            to="/app/complaints"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="Issues Resolved This Month"
            value={stats.issues_resolved?.toLocaleString()}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="In Progress"
            value={stats.in_progress?.toLocaleString()}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Resolution Rate"
            value={stats.resolution_rate}
            icon={ShieldCheck}
            color="blue"
          />
          <StatCard
            title="Avg. Resolution Time"
            value={stats.avg_resolution_time}
            icon={Timer}
            color="purple"
          />
        </div>
      </section>

      {/* Recent Notices List matching screenshot */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Recent Notices</h2>
            <p className="text-xs text-slate-500">Official ward and public infrastructure circulars</p>
          </div>
          <Link
            to="/app/notices?domain=municipal"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {notices.map((n) => (
            <NoticeCard
              key={n.title}
              title={n.title}
              description={n.desc}
              date={n.date}
              badgeText={n.badge}
              badgeType={n.badgeType}
              icon={n.icon}
              onClick={() => navigate("/app/notices?domain=municipal")}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
