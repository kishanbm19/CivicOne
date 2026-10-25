import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Calendar, Tag, Search, Filter } from "lucide-react";
import NoticeCard from "../components/dashboard/NoticeCard";
import { listPublicDocuments } from "../api/documents";

export default function PublishedNotices() {
  const [searchParams] = useSearchParams();
  const [domainFilter, setDomainFilter] = useState(searchParams.get("domain") || "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listPublicDocuments({
      domain: domainFilter || undefined,
      category: categoryFilter || undefined,
      size: 50,
    })
      .then((data) => setDocuments(data.items || []))
      .catch((err) => console.error("Error loading notices:", err))
      .finally(() => setLoading(false));
  }, [domainFilter, categoryFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Published Government Notices & Circulars
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Official service bulletins, infrastructure updates, and health guidelines verified by civic authorities.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200">
        {[
          { label: "All Notices", value: "" },
          { label: "Transport Services", value: "transport" },
          { label: "Municipal Services", value: "municipal" },
          { label: "Healthcare Services", value: "healthcare" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setDomainFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              domainFilter === tab.value
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notices Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading notices...</div>
      ) : documents.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-xs">
          No published circulars found for the selected category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="card p-6 border border-slate-200/80 flex flex-col justify-between hover:shadow-elevated transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    {doc.service_domain}
                  </span>
                  <span className="text-[11px] text-slate-400 capitalize">
                    {doc.category?.replace("_", " ")}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {doc.description || "Official circular published for public information."}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar size={13} /> {new Date(doc.created_at).toLocaleDateString()}
                </span>
                {doc.file_path && (
                  <a
                    href={doc.file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    View File
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
