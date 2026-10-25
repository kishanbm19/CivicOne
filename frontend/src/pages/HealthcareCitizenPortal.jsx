import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Building,
  Sparkles,
  Stethoscope,
  Heart,
  Search,
  ArrowRight,
  Calendar,
  Activity,
  Plus
} from "lucide-react";
import { HealthcareHeroIllustration } from "../components/common/HeroIllustrations";
import NoticeCard from "../components/dashboard/NoticeCard";

export default function HealthcareCitizenPortal() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/app/healthcare/appointments?search=${encodeURIComponent(searchQuery)}`);
  };

  const categories = [
    {
      title: "Hospitals & Clinics",
      desc: "Find government hospitals and primary health centres",
      icon: Building,
      color: "bg-rose-50 text-rose-600 border-rose-200",
      action: () => navigate("/app/healthcare/appointments"),
      btnText: "Find facilities",
    },
    {
      title: "Facilities & Cleanliness",
      desc: "Report facility issues, cleanliness and maintenance",
      icon: Sparkles,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      action: () => navigate("/app/complaints/new?domain=healthcare&category=facility_cleanliness"),
      btnText: "Report issue",
    },
    {
      title: "Medical Equipment",
      desc: "Report non-functional equipment",
      icon: Stethoscope,
      color: "bg-rose-50 text-rose-600 border-rose-200",
      action: () => navigate("/app/complaints/new?domain=healthcare&category=equipment"),
      btnText: "Report issue",
    },
    {
      title: "General Health Services",
      desc: "Access health schemes, camps and information",
      icon: Heart,
      color: "bg-rose-50 text-rose-600 border-rose-200",
      action: () => navigate("/app/notices?domain=healthcare"),
      btnText: "Explore schemes",
    },
  ];

  const initiatives = [
    {
      title: "Free Health Check-up Camp",
      desc: "General health check-up camp on Oct 28, 2026. Free BP, sugar, and vision screenings.",
      date: "Oct 21, 2026",
      badge: "Health Camp",
      badgeType: "health_camp",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "New PHC at Hunsur Road",
      desc: "Primary health centre now open for citizens offering diagnostic labs and care.",
      date: "Oct 18, 2026",
      badge: "Facility Update",
      badgeType: "facility_update",
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "Vaccination Drive",
      desc: "COVID-19 booster dose drive at all PHCs and civic health dispensaries.",
      date: "Oct 15, 2026",
      badge: "Announcement",
      badgeType: "announcement",
      image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Banner & Search */}
      <section className="rounded-3xl bg-gradient-to-br from-rose-50/70 via-white to-pink-50/50 p-6 sm:p-10 border border-rose-100/80 shadow-card">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100/80 text-rose-800 text-xs font-bold tracking-wide uppercase">
              <HeartPulse size={14} />
              <span>Healthcare Services</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Better Healthcare for a Healthier City
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Access healthcare services, find nearby facilities, report issues and stay informed.
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
                    placeholder="Search for services, facilities or type your location..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-healthcare text-xs sm:text-sm font-semibold whitespace-nowrap px-6 py-2.5"
                >
                  Get Information
                </button>
              </div>
            </form>
          </div>

          {/* Hero Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <HealthcareHeroIllustration />
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
                onClick={cat.action}
                className="card p-5 sm:p-6 card-hover cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${cat.color} group-hover:scale-105 transition-transform`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900 text-base group-hover:text-rose-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-rose-600">
                  <span>{cat.btnText}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Health Initiatives matching screenshot */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Health Initiatives</h2>
            <p className="text-xs text-slate-500">Public health programs, camps, and facility developments</p>
          </div>
          <Link
            to="/app/notices?domain=healthcare"
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {initiatives.map((item) => (
            <NoticeCard
              key={item.title}
              title={item.title}
              description={item.desc}
              date={item.date}
              badgeText={item.badge}
              badgeType={item.badgeType}
              image={item.image}
              onClick={() => navigate("/app/notices?domain=healthcare")}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
