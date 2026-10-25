import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bus, MapPin, Building, ShieldAlert, Search, ArrowRight, Calendar, AlertCircle } from "lucide-react";
import { TransportHeroIllustration } from "../components/common/HeroIllustrations";
import NoticeCard from "../components/dashboard/NoticeCard";

export default function TransportCitizenPortal() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/app/complaints/new?domain=transport&prefill=${encodeURIComponent(searchQuery)}`);
  };

  const categories = [
    {
      title: "Bus Services",
      desc: "Report delays, overcrowding and service issues",
      icon: Bus,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      catKey: "bus_delay",
    },
    {
      title: "Bus Stops",
      desc: "Report damaged bus stops, missing shelters",
      icon: MapPin,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      catKey: "bus_stop_damage",
    },
    {
      title: "Transport Infrastructure",
      desc: "Report road and transport infrastructure issues",
      icon: Building,
      color: "bg-cyan-50 text-cyan-700 border-cyan-200",
      catKey: "general",
    },
    {
      title: "Safety & Security",
      desc: "Report unsafe conditions and other concerns",
      icon: ShieldAlert,
      color: "bg-rose-50 text-rose-600 border-rose-200",
      catKey: "general",
    },
  ];

  const notices = [
    {
      title: "Route 45 Schedule Updated",
      desc: "New timetable effective from Oct 25, 2026. Added peak hour buses.",
      date: "Oct 22, 2026",
      badge: "Announcement",
      badgeType: "announcement",
      image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "New Bus Stop Shelter at Kuvempunagar",
      desc: "Installation completed with covered seating and digital arrival boards.",
      date: "Oct 20, 2026",
      badge: "Infrastructure",
      badgeType: "infrastructure",
      image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "Night Services Extended",
      desc: "Extended services on key routes during festival season until 1 AM.",
      date: "Oct 18, 2026",
      badge: "Service Update",
      badgeType: "service_update",
      image: "https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?w=600&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Banner and Search Card */}
      <section className="rounded-3xl bg-gradient-to-br from-blue-50/70 via-white to-sky-50/50 p-6 sm:p-10 border border-blue-100/80 shadow-card">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 text-blue-700 text-xs font-bold tracking-wide uppercase">
              <Bus size={14} />
              <span>Transport Services</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Safer, Smarter Public Transport for a Better City
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Report issues, get the latest updates and help us keep your city moving.
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
                    placeholder="Search for services, issues or type your location..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-transport text-xs sm:text-sm font-semibold whitespace-nowrap px-6 py-2.5"
                >
                  Report Issue
                </button>
              </div>
            </form>
          </div>

          {/* Hero Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <TransportHeroIllustration />
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
                onClick={() => navigate(`/app/complaints/new?domain=transport&category=${cat.catKey}`)}
                className="card p-5 sm:p-6 card-hover cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${cat.color} group-hover:scale-105 transition-transform`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                  <span>Report issue</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Latest Updates Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Latest Updates</h2>
            <p className="text-xs text-slate-500">Official notices published by the Transport Department</p>
          </div>
          <Link
            to="/app/notices?domain=transport"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {notices.map((n) => (
            <NoticeCard
              key={n.title}
              title={n.title}
              description={n.desc}
              date={n.date}
              badgeText={n.badge}
              badgeType={n.badgeType}
              image={n.image}
              onClick={() => navigate("/app/notices?domain=transport")}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
