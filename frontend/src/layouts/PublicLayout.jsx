import React from "react";
import { Outlet } from "react-router-dom";
import PublicNavbar from "../components/navigation/PublicNavbar";
import { ShieldCheck, Heart, Sparkles } from "lucide-react";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-white font-extrabold text-lg">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-white text-sm">
                <Sparkles size={16} />
              </span>
              CivicOne
            </div>
            <p className="mt-3 text-sm text-slate-400 max-w-md leading-relaxed">
              Unified digital identity and secure citizen services platform. Providing transparent complaint resolution, verified public notices, and isolated civic administration.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 w-fit">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>Synthetic demonstration platform with privacy controls. Not connected to official government databases.</span>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Service Domains</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="/services/transport" className="hover:text-white transition-colors">Transport Services</a></li>
              <li><a href="/services/municipal" className="hover:text-white transition-colors">Municipal Infrastructure</a></li>
              <li><a href="/services/healthcare" className="hover:text-white transition-colors">Public Healthcare</a></li>
              <li><a href="/app/complaints/new" className="hover:text-white transition-colors">Report an Issue</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Platform & Portals</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="/login" className="hover:text-white transition-colors">Citizen Portal</a></li>
              <li><a href="/government/login" className="hover:text-white transition-colors">Government Portal</a></li>
              <li><a href="/app/consent" className="hover:text-white transition-colors">Consent & Privacy</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CivicOne Platform. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for modern citizen empowerment & accountability.
          </p>
        </div>
      </footer>
    </div>
  );
}
