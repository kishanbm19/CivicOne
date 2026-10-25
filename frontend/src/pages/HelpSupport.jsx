import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle, Shield, FileQuestion, ArrowRight, Bus, Building2, HeartPulse } from "lucide-react";

export default function HelpSupport() {
  const faqs = [
    {
      q: "Does CivicOne track my live GPS location?",
      a: "No. CivicOne strictly enforces a manual address-based reporting model. Browser geolocation APIs and automatic coordinate detection are deliberately excluded to safeguard citizen privacy.",
    },
    {
      q: "How does AI complaint routing work?",
      a: "When you submit a complaint, OpenAI analyzes the title and description to categorize the issue and recommend a priority level. If AI confidence is low or the issue is critical, the complaint is routed to an administrative review queue with deterministic fallbacks.",
    },
    {
      q: "Can other citizens view my complaints?",
      a: "No. The system strictly isolates citizen records using database-level ownership checks. Only authorized department staff within the assigned domain can inspect complaint details.",
    },
    {
      q: "How do I manage data consent between services?",
      a: "You can navigate to the Consent Preferences page to view which departments hold active authorization to access your synthetic profile, and revoke consent with immediate audit-logged effect.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Help & Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Guidance on complaint filing, department workflows, and privacy principles.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((f, i) => (
          <div key={i} className="card p-6 border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-900 text-base flex items-start gap-2.5">
              <FileQuestion size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <span>{f.q}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7">
              {f.a}
            </p>
          </div>
        ))}
      </div>

      <div className="card p-6 bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-blue-900 text-sm">Need immediate assistance with an issue?</h4>
          <p className="text-xs text-blue-800 mt-0.5">Submit an issue directly to the municipal or transit operations desk.</p>
        </div>
        <Link to="/app/complaints/new" className="btn text-xs py-2 px-4 whitespace-nowrap">
          Report an Issue
        </Link>
      </div>
    </div>
  );
}
