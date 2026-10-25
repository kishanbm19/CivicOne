import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  Building2,
  HeartPulse,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  FileText,
  Search,
  Lock,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import Logo from "../components/common/Logo";
import { getPublicStats, listPublicDocuments } from "../api";
import { TransportHeroIllustration } from "../components/common/HeroIllustrations";

export default function Landing() {
  const [stats, setStats] = useState({
    issues_resolved: 1245,
    in_progress: 320,
    resolution_rate: "95%",
    avg_resolution_time: "2.4 Days",
  });
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    getPublicStats().then(setStats).catch(() => {});
    listPublicDocuments({ size: 3 })
      .then((data) => setNotices(data.items || []))
      .catch(() => {});
  }, []);

  const serviceDomains = [
    {
      domain: "transport",
      title: "Transport Services",
      desc: "Report bus delays, overcrowding, damaged shelters, and commuter infrastructure concerns.",
      icon: Bus,
      link: "/services/transport",
      color: "border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700",
      iconBg: "bg-blue-600 text-white",
      badge: "Transport Operations",
    },
    {
      domain: "municipal",
      title: "Municipal Services",
      desc: "Report uncollected waste, potholes, broken streetlights, water supply, and drainage issues.",
      icon: Building2,
      link: "/services/municipal",
      color: "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700",
      iconBg: "bg-emerald-600 text-white",
      badge: "Civic Infrastructure",
    },
    {
      domain: "healthcare",
      title: "Healthcare Services",
      desc: "Browse hospitals & PHCs, report facility issues, non-functional equipment, and schedule visits.",
      icon: HeartPulse,
      link: "/services/healthcare",
      color: "border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700",
      iconBg: "bg-rose-600 text-white",
      badge: "Public Health",
    },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 p-8 sm:p-14 border border-blue-100/90 shadow-elevated">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold tracking-wide uppercase shadow-subtle">
                <Sparkles size={14} />
                <span>Unified Civic Services Platform</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                One Identity.<br />
                <span className="text-blue-600">A Better, More Liveable City.</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Access transport, municipal, and healthcare services through one secure account. Report issues, track requests, and stay informed with transparent civic governance.
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/register" className="btn text-sm sm:text-base px-6 py-3">
                  Get Started <ArrowRight size={16} />
                </Link>
                <a href="#services" className="btn-ghost text-sm sm:text-base px-6 py-3">
                  Explore Services
                </a>
              </div>

              {/* Feature Highlights */}
              <div className="pt-4 flex flex-wrap gap-6 text-xs font-medium text-slate-500 border-t border-slate-200/60">
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-500" /> Address-based reporting (No GPS)
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-500" /> AI-Assisted Routing & Fallbacks
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-500" /> Role-Based Department Isolation
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <TransportHeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* 3 Service Domain Cards */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Integrated Civic Services
          </h2>
          <p className="text-slate-600 text-sm">
            Citizens can access all public domain portals directly with full privacy and consent controls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {serviceDomains.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.domain}
                className={`card p-6 border ${s.color} card-hover flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`grid h-12 w-12 place-items-center rounded-2xl ${s.iconBg} shadow-sm`}>
                      <Icon size={22} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200">
                      {s.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    {s.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between">
                  <Link
                    to={s.link}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold hover:underline"
                  >
                    Open Citizen Portal <ChevronRight size={16} />
                  </Link>
                  <Link
                    to={`/app/complaints/new?domain=${s.domain}`}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Report Issue
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Database-Backed Public Highlights */}
      <section className="bg-slate-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Live City Resolution Metrics
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Real-time aggregated performance across all civic departments.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/80 text-center">
              <p className="text-3xl sm:text-4xl font-black text-emerald-400">
                {stats.issues_resolved?.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-slate-300 mt-2">Issues Resolved This Month</p>
            </div>
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/80 text-center">
              <p className="text-3xl sm:text-4xl font-black text-amber-400">
                {stats.in_progress?.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-slate-300 mt-2">In Progress Under Review</p>
            </div>
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/80 text-center">
              <p className="text-3xl sm:text-4xl font-black text-blue-400">
                {stats.resolution_rate}
              </p>
              <p className="text-xs font-semibold text-slate-300 mt-2">Verified Resolution Rate</p>
            </div>
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/80 text-center">
              <p className="text-3xl sm:text-4xl font-black text-purple-400">
                {stats.avg_resolution_time}
              </p>
              <p className="text-xs font-semibold text-slate-300 mt-2">Average Resolution Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            How CivicOne Works
          </h2>
          <p className="text-slate-600 text-sm">
            A privacy-first, verified workflow connecting citizens directly with specialized department responders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card p-6 border border-slate-200 space-y-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700 font-bold text-sm">
              1
            </div>
            <h4 className="font-bold text-slate-900 text-base">Submit with Manual Address</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Describe your civic issue and enter your street or landmark manually. No invasive GPS tracking or automatic coordinate collection.
            </p>
          </div>
          <div className="card p-6 border border-slate-200 space-y-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700 font-bold text-sm">
              2
            </div>
            <h4 className="font-bold text-slate-900 text-base">AI Classification & Routing</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              OpenAI structures and recommends priority and category, routed directly to the authorized department queue with deterministic fail-safes.
            </p>
          </div>
          <div className="card p-6 border border-slate-200 space-y-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700 font-bold text-sm">
              3
            </div>
            <h4 className="font-bold text-slate-900 text-base">Track Status & Transparent Updates</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Monitor updates along an immutable audit timeline. Reopen resolved items if unsatisfied, or manage your cross-department consent grants.
            </p>
          </div>
        </div>
      </section>

      {/* Dual Portals CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Citizen Portal Card */}
          <div className="card p-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 border border-blue-200 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase">
              Public Portal
            </div>
            <h3 className="text-2xl font-black text-slate-900">Citizen Services Portal</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Register or sign in to file complaints, track existing issues, schedule synthetic healthcare appointments, and view public notices.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link to="/login" className="btn text-xs sm:text-sm">
                Citizen Login
              </Link>
              <Link to="/register" className="btn-ghost text-xs sm:text-sm">
                New Registration
              </Link>
            </div>
          </div>

          {/* Government Portal Card */}
          <div className="card p-8 bg-slate-900 text-white border border-slate-800 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-amber-400 text-xs font-bold uppercase border border-slate-700">
              <Lock size={12} /> Restricted Access
            </div>
            <h3 className="text-2xl font-black text-white">Government & Staff Portal</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Authorized municipal, transit, and healthcare staff manage queues, update complaint statuses, publish verified circulars, and monitor analytics.
            </p>
            <div className="pt-2">
              <Link
                to="/government/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Government Staff Login <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
