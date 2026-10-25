import React from "react";
import { Outlet } from "react-router-dom";
import CitizenNavbar from "../components/navigation/CitizenNavbar";

export default function CitizenLayout() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900">
      <CitizenNavbar />
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>CivicOne Unified Citizen Portal • Demonstrative platform with synthetic data • No live GPS or real PII collected</p>
        </div>
      </footer>
    </div>
  );
}
