import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Building,
  User,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  MessageSquare,
  FileText,
  Sparkles,
  Send,
  Lock
} from "lucide-react";
import StatusBadge from "../components/common/StatusBadge";
import PriorityBadge from "../components/common/PriorityBadge";
import {
  getComplaint,
  updateComplaintStatus,
  assignComplaint,
  addInternalNote,
  reopenComplaint
} from "../api/complaints";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../api/axios";

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isStaff = user?.role !== "citizen";

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Staff action inputs
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [citizenVisible, setCitizenVisible] = useState(true);
  const [internalNoteText, setInternalNoteText] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadDetail = () => {
    setLoading(true);
    getComplaint(id)
      .then((data) => {
        setComplaint(data);
        setNewStatus(data.status);
      })
      .catch((err) => {
        setError(errMsg(err));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (newStatus === complaint?.status) return;
    setSubmittingAction(true);
    setError(null);
    try {
      await updateComplaintStatus(id, {
        new_status: newStatus,
        reason: statusReason || undefined,
        citizen_visible: citizenVisible,
      });
      setActionSuccess(`Status updated to ${newStatus.replace("_", " ")}`);
      setStatusReason("");
      loadDetail();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;
    setSubmittingAction(true);
    setError(null);
    try {
      await addInternalNote(id, internalNoteText);
      setActionSuccess("Internal note recorded.");
      setInternalNoteText("");
      loadDetail();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReopen = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;
    setSubmittingAction(true);
    setError(null);
    try {
      await reopenComplaint(id, reopenReason);
      setActionSuccess("Complaint has been reopened for department review.");
      setReopenReason("");
      loadDetail();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading complaint details...
      </div>
    );
  }

  if (error && !complaint) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="card p-8 border border-slate-200 space-y-4">
          <AlertCircle size={36} className="text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Unable to view complaint</h2>
          <p className="text-xs sm:text-sm text-slate-600">{error}</p>
          <button
            onClick={() => navigate(isStaff ? "/government/complaints" : "/app/complaints")}
            className="btn text-xs sm:text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const allowedStatuses = [
    "submitted",
    "classified",
    "assigned",
    "acknowledged",
    "in_progress",
    "on_hold",
    "resolved",
    "closed",
    "reopened"
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(isStaff ? "/government/complaints" : "/app/complaints")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Complaints
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Details Card */}
      <div className="card p-6 sm:p-8 border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                {complaint.reference}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {complaint.domain} Services
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {complaint.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} />
          </div>
        </div>

        {/* Location & Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <span className="text-slate-400 font-medium block">Manual Location:</span>
            <p className="font-semibold text-slate-800 mt-0.5 flex items-start gap-1">
              <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <span>{complaint.address} {complaint.locality ? `(${complaint.locality})` : ""}</span>
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Assigned Department:</span>
            <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
              <Building size={14} className="text-slate-400" />
              <span>{complaint.department_name || "Central Review Queue"}</span>
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Submitted At:</span>
            <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
              <Calendar size={14} className="text-slate-400" />
              <span>{new Date(complaint.created_at).toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Issue Description
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-100">
            {complaint.description}
          </p>
        </div>

        {/* Attached Photo */}
        {complaint.image_url && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Attached Photograph
            </h3>
            <div className="rounded-2xl overflow-hidden border border-slate-200 max-w-md">
              <img
                src={complaint.image_url}
                alt="Complaint attachment"
                className="w-full h-auto max-h-64 object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          </div>
        )}

        {/* AI Classification Info */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles size={14} className="text-blue-600" />
            <span>AI Classification Audit Result</span>
          </div>
          <p>
            Method: <span className="font-semibold uppercase">{complaint.classified_by}</span> • Category: <span className="font-semibold">{complaint.category}</span> • Priority: <span className="font-semibold uppercase">{complaint.priority}</span>
          </p>
          {complaint.ai_explanation && (
            <p className="text-blue-700 italic">"{complaint.ai_explanation}"</p>
          )}
        </div>
      </div>

      {/* Staff Actions Section (Only for Staff / Admin) */}
      {isStaff && (
        <div className="card p-6 sm:p-8 border border-slate-200 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Department Processing & Workflow
          </h2>

          {/* Status Update Form */}
          <form onSubmit={handleStatusChange} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Update Complaint Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="input capitalize"
                >
                  {allowedStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Citizen Visibility
                </label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={citizenVisible}
                    onChange={(e) => setCitizenVisible(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Publish this status update to citizen timeline</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Reason / Action Taken
              </label>
              <textarea
                rows={2}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Explain the update (e.g. dispatched repair crew, ordered replacement parts)..."
                className="input"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submittingAction || newStatus === complaint.status}
              className="btn text-xs sm:text-sm font-semibold py-2 px-5 disabled:opacity-50"
            >
              Update Status
            </button>
          </form>

          {/* Internal Staff Notes (Staff Only) */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-slate-400" />
              <h3 className="font-bold text-slate-900 text-sm">Internal Department Notes (Private to Staff)</h3>
            </div>

            <form onSubmit={handleAddInternalNote} className="space-y-2">
              <textarea
                rows={2}
                value={internalNoteText}
                onChange={(e) => setInternalNoteText(e.target.value)}
                placeholder="Add private operational note for team members..."
                className="input text-xs"
              ></textarea>
              <button
                type="submit"
                disabled={submittingAction || !internalNoteText.trim()}
                className="btn-ghost text-xs font-semibold py-1.5 px-4 disabled:opacity-50"
              >
                Add Internal Note
              </button>
            </form>

            {complaint.internal_notes?.length > 0 && (
              <div className="space-y-2 pt-2">
                {complaint.internal_notes.map((note) => (
                  <div key={note.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                      <span>{note.author_name}</span>
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-800">{note.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Citizen Reopening Option (If resolved or closed) */}
      {!isStaff && ["resolved", "closed"].includes(complaint.status) && (
        <div className="card p-6 border border-slate-200 space-y-4 bg-amber-50/40">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <RotateCcw size={16} className="text-amber-600" />
            <span>Unsatisfied with resolution? Reopen this complaint</span>
          </div>
          <form onSubmit={handleReopen} className="space-y-3">
            <textarea
              rows={2}
              required
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="State why the issue requires further inspection or is still unresolved..."
              className="input text-xs"
            ></textarea>
            <button
              type="submit"
              disabled={submittingAction || !reopenReason.trim()}
              className="btn bg-amber-600 hover:bg-amber-700 text-xs py-2 px-4"
            >
              Request Reopen
            </button>
          </form>
        </div>
      )}

      {/* Status History & Live Timeline */}
      <div className="card p-6 sm:p-8 border border-slate-200 space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Status & Activity Timeline
        </h2>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {(complaint.history || []).map((h, i) => (
            <div key={h.id || i} className="relative">
              <div className="absolute -left-6 top-1 grid h-5 w-5 place-items-center rounded-full bg-white ring-4 ring-slate-50 border-2 border-blue-500">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={h.new_status} />
                  <span className="text-xs text-slate-400">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
                {h.reason && (
                  <p className="mt-1 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {h.reason}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Actor: <span className="font-semibold">{h.actor_name}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
