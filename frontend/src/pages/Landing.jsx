import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  Building2,
  HeartPulse,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Lock,
  ChevronRight,
} from "lucide-react";
import { getPublicStats, listPublicDocuments } from "../services";
import { TransportHeroIllustration } from "../components/common/HeroIllustrations";

export default function Landing() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [notices, setNotices] = useState([]);
  const [noticesError, setNoticesError] = useState(false);
  const [noticesLoading, setNoticesLoading] = useState(true);

  useEffect(() => {
    getPublicStats()
      .then(setStats)
      .catch((err) => {
        console.error("Unable to load public service statistics:", err);
        setStatsError(true);
      });
    listPublicDocuments({ size: 3 })
      .then((data) => setNotices(data.items || []))
      .catch((err) => {
        console.error("Unable to load public notices:", err);
        setNoticesError(true);
      })
      .finally(() => setNoticesLoading(false));
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
    <div className="space-y-16 py-8 sm:py-10">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 p-8 sm:p-14 border border-slate-800 shadow-elevated">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -right-8 -top-12 h-56 w-56 rounded-full border border-white/10" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-blue-100 text-xs font-bold tracking-wide uppercase border border-white/10">
                <Sparkles size={14} aria-hidden="true" />
                <span>Citizen services, connected</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
                A clearer way to<br />
                <span className="text-blue-300">get civic issues resolved.</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                Report a service issue, follow its progress, and find public updates in one place. CivicOne connects residents with the teams responsible for local services.
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/register" className="btn text-sm sm:text-base px-6 py-3">
                  Access citizen services <ArrowRight size={16} />
                </Link>
                <a href="#services" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-white/10 transition-colors">
                  Explore Services
                </a>
              </div>

              {/* Feature Highlights */}
              <div className="pt-4 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-300 border-t border-white/15">
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-400" aria-hidden="true" /> Track submitted requests
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-400" aria-hidden="true" /> Read verified public updates
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-400" aria-hidden="true" /> Contact the right service team
                </span>
              </div>
            </div>

            <div className="relative lg:col-span-5 flex justify-center rounded-2xl bg-white/95 p-3 shadow-2xl">
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

      {/* Published public notices */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Stay informed</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Public notices
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Updates published by participating service departments.
            </p>
          </div>
          <Link to="/notices" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
            View all notices <ChevronRight size={16} />
          </Link>
        </div>
        {noticesLoading ? (
          <div className="card p-6 text-sm text-slate-500">Loading published notices...</div>
        ) : noticesError ? (
          <div role="status" className="card p-6 text-sm text-rose-700">
            Public notices could not be loaded. Please try again later.
          </div>
        ) : notices.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500">There are no published notices at this time.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notices.map((notice) => (
              <Link key={notice.id} to="/notices" className="card card-hover p-5 block">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    {(notice.service_domain || "Civic").replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-slate-500">
                    {notice.created_at ? new Date(notice.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-slate-900">{notice.title}</h3>
                <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                  {notice.description || "Open this notice for more information."}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Database-backed public metrics */}
      <section className="bg-slate-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-300">Service activity</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Civic service overview</h2>
            <p className="text-slate-400 text-sm">
              Current aggregate request figures from the CivicOne service database.
            </p>
          </div>
          {statsError ? (
            <p role="status" className="text-center text-sm text-rose-300">
              Service statistics could not be loaded. Please try again later.
            </p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                ["Total requests", stats?.total_complaints],
                ["Resolved", stats?.issues_resolved],
                ["In progress", stats?.in_progress],
                ["Resolution rate", stats?.resolution_rate],
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-800/80 p-5 sm:p-6 rounded-2xl border border-slate-700/80 text-center">
                  <p className="text-2xl sm:text-3xl font-black text-white">
                    {value == null ? (stats ? "—" : "…") : typeof value === "number" && label !== "Resolution rate" ? value.toLocaleString() : `${value}${label === "Resolution rate" ? "%" : ""}`}
                  </p>
                  <p className="text-xs font-semibold text-slate-300 mt-2">{label}</p>
                </div>
              ))}
            </div>
          )}
          {!statsError && stats && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Requests by service area</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Aggregated counts only; individual complaint details are private.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {serviceDomains.map((service) => {
                  const domainStats = stats.requests_by_domain?.[service.domain] || {
                    total: 0,
                    resolved: 0,
                    in_progress: 0,
                    pending: 0,
                    rejected: 0,
                  };
                  const Icon = service.icon;
                  return (
                    <div
                      key={service.domain}
                      className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-blue-200">
                          <Icon size={19} aria-hidden="true" />
                        </span>
                        <div>
                          <h4 className="font-semibold text-white">{service.title}</h4>
                          <p className="text-2xl font-black text-white">
                            {domainStats.total.toLocaleString()}
                            <span className="ml-2 text-xs font-medium text-slate-400">requests</span>
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-700 pt-3 text-xs text-slate-300">
                        <span>Resolved: {domainStats.resolved.toLocaleString()}</span>
                        <span>In progress: {domainStats.in_progress.toLocaleString()}</span>
                        <span>Pending: {domainStats.pending.toLocaleString()}</span>
                        <span>Rejected: {domainStats.rejected.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
