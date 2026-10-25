import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Filter, Plus, ChevronRight, Bus, Building2, HeartPulse, RefreshCw } from "lucide-react";
import StatusBadge from "../components/common/StatusBadge";
import PriorityBadge from "../components/common/PriorityBadge";
import { listComplaints } from "../api/complaints";

export default function MyComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchComplaints = () => {
    setLoading(true);
    listComplaints({
      domain: domainFilter || undefined,
      status: statusFilter || undefined,
      search: search || undefined,
      size: 50,
    })
      .then((data) => setComplaints(data.items || []))
      .catch((err) => console.error("Error fetching complaints:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComplaints();
  }, [domainFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComplaints();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            My Submitted Complaints
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track status transitions, responses, and verified resolutions.
          </p>
        </div>
        <Link to="/app/complaints/new" className="btn text-xs sm:text-sm">
          <Plus size={16} /> New Complaint
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, title or address..."
            className="input pl-10 text-xs sm:text-sm py-2"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Domain Filter */}
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="input py-2 text-xs w-auto capitalize"
          >
            <option value="">All Service Domains</option>
            <option value="transport">Transport Services</option>
            <option value="municipal">Municipal Services</option>
            <option value="healthcare">Healthcare Services</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input py-2 text-xs w-auto capitalize"
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="reopened">Reopened</option>
          </select>

          <button
            onClick={fetchComplaints}
            title="Refresh"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Complaints List Table */}
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
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                    No complaints found matching the criteria.
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
                    <td className="py-3.5 px-4 font-semibold capitalize text-slate-600">
                      {c.domain}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
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
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
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
  );
}
