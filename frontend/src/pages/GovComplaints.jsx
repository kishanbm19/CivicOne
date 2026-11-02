import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { Search, RefreshCw } from "lucide-react";
import StatusBadge, { COMPLAINT_STATUSES } from "../components/common/StatusBadge";
import PriorityBadge from "../components/common/PriorityBadge";
import { listComplaints, listComplaintStaffOptions } from "../services/complaints";

export default function GovComplaints() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const outletCtx = useOutletContext() || {};
  const activeDomain = outletCtx.domain || "transport";

  const [activeTab, setActiveTab] = useState(searchParams.get("filter") === "assigned_to_me" ? "assigned_to_me" : "all");
  const [complaints, setComplaints] = useState([]);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [assignedStaffFilter, setAssignedStaffFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [staffOptions, setStaffOptions] = useState([]);
  const [search, setSearch] = useState("");

  const fetchComplaints = (requestedPage = page) => {
    setLoading(true);
    const endOfDay = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : undefined;
    listComplaints({
      domain: activeDomain,
      page: requestedPage,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      category: categoryFilter || undefined,
      assigned_to_user_id: assignedStaffFilter || undefined,
      start_date: startDate ? `${startDate}T00:00:00` : undefined,
      end_date: endOfDay,
      overdue_only: overdueOnly || undefined,
      search: search || undefined,
      assigned_to_me: activeTab === "assigned_to_me",
      size: 50,
    })
      .then((data) => {
        setComplaints(data.items || []);
        setTotalComplaints(data.total || 0);
      })
      .catch((err) => console.error("Error loading staff complaints:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComplaints();
  }, [activeDomain, activeTab, statusFilter, priorityFilter, categoryFilter, assignedStaffFilter, startDate, endDate, overdueOnly, page]);

  useEffect(() => {
    listComplaintStaffOptions(activeDomain)
      .then(setStaffOptions)
      .catch((err) => console.error("Error loading complaint staff filters:", err));
  }, [activeDomain]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Organization Complaint Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review all complaints across your organization. Processing actions remain limited to your authorized departments.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => {
            setPage(1);
            setActiveTab("all");
          }}
          className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          All Organization Complaints
        </button>
        <button
          onClick={() => {
            setPage(1);
            setActiveTab("assigned_to_me");
          }}
          className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeTab === "assigned_to_me"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Assigned to Me
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, title, or address..."
            className="input pl-10 text-xs sm:text-sm py-2"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="input py-2 text-xs w-auto capitalize"
          >
            <option value="">All Statuses</option>
            {COMPLAINT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => {
              setPage(1);
              setCategoryFilter(e.target.value);
            }}
            placeholder="Category"
            aria-label="Filter by category"
            className="input py-2 text-xs w-28"
          />

          <select
            value={assignedStaffFilter}
            onChange={(e) => {
              setPage(1);
              setAssignedStaffFilter(e.target.value);
            }}
            aria-label="Filter by assigned staff"
            className="input py-2 text-xs w-auto"
          >
            <option value="">All Staff</option>
            {staffOptions.map((staff) => (
              <option key={staff.user_id} value={staff.user_id}>{staff.full_name}</option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPage(1);
              setStartDate(e.target.value);
            }}
            aria-label="Created from"
            className="input py-2 text-xs w-auto"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPage(1);
              setEndDate(e.target.value);
            }}
            aria-label="Created through"
            className="input py-2 text-xs w-auto"
          />
          <label className="flex items-center gap-1.5 px-2 text-xs font-semibold text-rose-700">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => {
                setPage(1);
                setOverdueOnly(e.target.checked);
              }}
            />
            Overdue only
          </label>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPage(1);
              setPriorityFilter(e.target.value);
            }}
            className="input py-2 text-xs w-auto capitalize"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={fetchComplaints}
            title="Refresh list"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="card overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Staff</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                    Loading organization complaints...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                    No complaints found in this queue.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/government/complaints/${c.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 text-xs">
                      {c.reference}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      {c.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {c.locality || c.address?.split(",")[0] || "Civic Area"}
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {c.assigned_staff_name || "Unassigned"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-semibold text-blue-600 hover:underline">
                        {c.can_process ? "Process" : "View details"} →
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            Showing {totalComplaints === 0 ? 0 : (page - 1) * 50 + 1}–
            {Math.min(page * 50, totalComplaints)} of {totalComplaints} complaints
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={page === 1 || loading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {page} of {Math.max(1, Math.ceil(totalComplaints / 50))}</span>
            <button
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={loading || page >= Math.ceil(totalComplaints / 50)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
