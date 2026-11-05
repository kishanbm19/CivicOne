import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { MapPin, Calendar, Building, ArrowLeft, Clock, CheckCircle2, AlertCircle, Sparkles, Lock } from "lucide-react";
import StatusBadge, {
  COMPLAINT_STATUSES,
  COMPLAINT_STATUS_TRANSITIONS,
} from "../components/common/StatusBadge";
import PriorityBadge from "../components/common/PriorityBadge";
import {
  getComplaint,
  updateComplaintStatus,
  assignComplaint,
  addInternalNote,
  requestComplaintInformation,
  uploadComplaintEvidence,
  listComplaintStaffOptions,
  getComplaintImage,
  downloadComplaintEvidence,
} from "../services/complaints";
import { listDepartments } from "../services/services";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../services/axios";

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, staffProfile } = useAuth();
  const outletCtx = useOutletContext() || {};

  const isStaff = user?.role !== "citizen";
  const canAssignComplaint = (complaintData) => (
    user?.role === "org_admin"
    || (
      user?.role === "staff"
      && complaintData?.can_process
      && complaintData?.assigned_to_user_id === user.id
      && staffProfile?.departments?.some(
        (department) => department.id === complaintData.department_id
          && ["department_admin", "admin"].includes(department.role_in_dept)
      )
    )
  );

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const isAssignedToCurrentUser = complaint?.assigned_to_user_id === user?.id;
  const canShowProcessingWorkflow = complaint?.can_process
    && (user?.role !== "staff" || isAssignedToCurrentUser);

  // Staff action inputs
  const [newStatus, setNewStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [citizenVisible, setCitizenVisible] = useState(true);
  const [internalNoteText, setInternalNoteText] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [staffOptions, setStaffOptions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assignmentDepartment, setAssignmentDepartment] = useState("");
  const [assignmentStaff, setAssignmentStaff] = useState("");
  const [informationRequestText, setInformationRequestText] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceCitizenVisible, setEvidenceCitizenVisible] = useState(true);
  const [complaintImageSrc, setComplaintImageSrc] = useState(null);

  const loadDetail = () => {
    setLoading(true);
    getComplaint(id)
      .then((data) => {
        setComplaint(data);
        setNewStatus(data.status);
        setAssignmentDepartment(data.department_id || "");
        setAssignmentStaff(data.assigned_to_user_id || "");
        if (canAssignComplaint(data)) {
          Promise.all([
            listComplaintStaffOptions(data.domain),
            listDepartments(),
          ]).then(([staff, depts]) => {
            setStaffOptions(staff || []);
            setDepartments(depts || []);
          }).catch((err) => setError(errMsg(err)));
        }
      })
      .catch((err) => {
        setError(errMsg(err));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  useEffect(() => {
    let objectUrl;
    if (!complaint?.image_url) {
      setComplaintImageSrc(null);
      return undefined;
    }
    getComplaintImage(id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setComplaintImageSrc(objectUrl);
      })
      .catch((err) => setError(errMsg(err)));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [complaint?.image_url, id]);

  const handleEvidenceDownload = async (evidence) => {
    setError(null);
    try {
      const blob = await downloadComplaintEvidence(id, evidence.id);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = evidence.file_name;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (
      !complaint
      || !COMPLAINT_STATUS_TRANSITIONS[complaint.status]?.includes(newStatus)
    ) return;
    setSubmittingAction(true);
    setError(null);
    try {
      await updateComplaintStatus(id, {
        new_status: newStatus,
        reason: statusReason || undefined,
        citizen_visible: citizenVisible,
      });
      const updatedLabel = COMPLAINT_STATUSES.find(
        (status) => status.value === newStatus
      )?.label;
      setActionSuccess(`Status updated to ${updatedLabel}`);
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

  const handleAssignment = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    setError(null);
    try {
      await assignComplaint(id, {
        department_id: assignmentDepartment || undefined,
        assigned_to_user_id: assignmentStaff || null,
      });
      setActionSuccess("Complaint assignment updated.");
      loadDetail();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleInformationRequest = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    setError(null);
    try {
      await requestComplaintInformation(id, informationRequestText);
      setActionSuccess("Additional information requested from the citizen.");
      setInformationRequestText("");
      loadDetail();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleEvidenceUpload = async (e) => {
    e.preventDefault();
    if (!evidenceFile) return;
    setSubmittingAction(true);
    setError(null);
    try {
      await uploadComplaintEvidence(id, evidenceFile, evidenceCitizenVisible);
      setActionSuccess("Resolution evidence uploaded.");
      setEvidenceFile(null);
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

  const allowedStatuses = COMPLAINT_STATUS_TRANSITIONS[complaint.status] || [];
  const currentStatus = COMPLAINT_STATUSES.find(
    (status) => status.value === complaint.status
  );
  const timeline = [
    ...(complaint.history || []).map((item) => ({
      ...item,
      type: "status",
      summary: item.reason,
      sortTime: new Date(item.created_at).getTime(),
    })),
    ...(complaint.activities || []).map((item) => ({
      ...item,
      type: "activity",
      sortTime: new Date(item.created_at).getTime(),
    })),
  ].sort((a, b) => a.sortTime - b.sortTime);

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
              <span>
                {complaint.department_name
                  || (complaint.needs_review ? "Department assignment pending review" : "Department not assigned")}
              </span>
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Submitted At:</span>
            <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
              <Calendar size={14} className="text-slate-400" />
              <span>{new Date(complaint.created_at).toLocaleString()}</span>
            </p>
          </div>
          {isStaff && (
            <div>
              <span className="text-slate-400 font-medium block">Assigned Staff:</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {complaint.assigned_staff_name || "Department queue (unassigned)"}
              </p>
            </div>
          )}
          <div>
            <span className="text-slate-400 font-medium block">Resolution Deadline:</span>
            <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
              <Clock size={14} className="text-slate-400" />
              <span>{complaint.resolution_due_at ? new Date(complaint.resolution_due_at).toLocaleString() : "No SLA configured"}</span>
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
        {complaint.image_url && complaintImageSrc && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Attached Photograph
            </h3>
            <div className="rounded-2xl overflow-hidden border border-slate-200 max-w-md">
              <img
                src={complaintImageSrc}
                alt="Complaint attachment"
                className="w-full h-auto max-h-64 object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          </div>
        )}

        {complaint.evidence?.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Resolution Evidence
            </h3>
            <ul className="space-y-2">
              {complaint.evidence.map((evidence) => (
                <li key={evidence.id}>
                  <a
                    href={evidence.download_url}
                    onClick={(event) => {
                      event.preventDefault();
                      handleEvidenceDownload(evidence);
                    }}
                    className="text-sm font-semibold text-blue-700 hover:underline"
                  >
                    {evidence.file_name}
                  </a>
                  <span className="ml-2 text-xs text-slate-400">
                    {new Date(evidence.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isStaff && (
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
        )}
      </div>

      {/* Staff Actions Section (Only for Staff / Admin) */}
      {isStaff && !complaint.can_process && (
        <div className="card p-4 border border-slate-200 bg-slate-50 text-sm text-slate-600">
          You can view this complaint because it belongs to your organization.
          Only its assigned staff member or an administrator can make changes.
        </div>
      )}

      {isStaff
        && canAssignComplaint(complaint) && (
        <div className="card p-6 border border-slate-200">
          <form onSubmit={handleAssignment} className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Assign / Reassign Complaint</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={assignmentDepartment}
                onChange={(e) => {
                  setAssignmentDepartment(e.target.value);
                  setAssignmentStaff("");
                }}
                className="input"
                required
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <select
                value={assignmentStaff}
                onChange={(e) => setAssignmentStaff(e.target.value)}
                className="input"
                disabled={!assignmentDepartment}
              >
                <option value="">Department queue (unassigned)</option>
                {staffOptions
                  .filter((staff) => staff.department_id === assignmentDepartment)
                  .map((staff) => (
                    <option key={staff.user_id} value={staff.user_id}>{staff.full_name}</option>
                  ))}
              </select>
            </div>
            <button type="submit" disabled={submittingAction || !assignmentDepartment} className="btn text-xs">
              Save Assignment
            </button>
          </form>
        </div>
      )}

      {isStaff && canShowProcessingWorkflow && (
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
                  disabled={!currentStatus || allowedStatuses.length === 0}
                  className="input capitalize"
                >
                  <option value={complaint.status}>
                    {currentStatus?.label || "Unsupported status"}
                  </option>
                  {allowedStatuses.map((statusValue) => {
                    const status = COMPLAINT_STATUSES.find(
                      (item) => item.value === statusValue
                    );
                    return (
                      <option key={statusValue} value={statusValue}>
                        {status.label}
                      </option>
                    );
                  })}
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
                required={newStatus === "resolved"}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={newStatus === "resolved"
                  ? "Required: record the resolution and work completed..."
                  : "Explain the status update..."}
                className="input"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={
                submittingAction
                || newStatus === complaint.status
                || !allowedStatuses.includes(newStatus)
              }
              className="btn text-xs sm:text-sm font-semibold py-2 px-5 disabled:opacity-50"
            >
              Update Status
            </button>
          </form>

          <div className="border-b border-slate-100 pb-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Request More Information</h3>
            <form onSubmit={handleInformationRequest} className="space-y-2">
              <textarea
                rows={2}
                value={informationRequestText}
                onChange={(e) => setInformationRequestText(e.target.value)}
                required
                minLength={5}
                maxLength={2000}
                placeholder="Tell the citizen what information or clarification is needed..."
                className="input text-xs"
              />
              <button type="submit" disabled={submittingAction} className="btn-ghost text-xs font-semibold">
                Send Information Request
              </button>
            </form>
          </div>

          <div className="border-b border-slate-100 pb-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Resolution Evidence</h3>
            <form onSubmit={handleEvidenceUpload} className="flex flex-col sm:flex-row gap-3">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                className="input text-xs"
              />
              <label className="flex items-center gap-2 text-xs whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={evidenceCitizenVisible}
                  onChange={(e) => setEvidenceCitizenVisible(e.target.checked)}
                />
                Citizen can view
              </label>
              <button type="submit" disabled={submittingAction || !evidenceFile} className="btn text-xs">
                Upload Evidence
              </button>
            </form>
            {complaint.priority === "high" || complaint.priority === "critical" ? (
              <p className="text-xs text-amber-700">High-priority complaints require evidence before resolution.</p>
            ) : null}
          </div>

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

      {/* Status History & Live Timeline */}
      <div className="card p-6 sm:p-8 border border-slate-200 space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Status & Activity Timeline
        </h2>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {timeline.map((h, i) => (
            <div key={h.id || i} className="relative">
              <div className="absolute -left-6 top-1 grid h-5 w-5 place-items-center rounded-full bg-white ring-4 ring-slate-50 border-2 border-blue-500">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {h.type === "status" ? (
                    <StatusBadge status={h.new_status} />
                  ) : (
                    <span className="text-xs font-semibold capitalize text-slate-700">
                      {h.action?.replaceAll("_", " ")}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
                {h.summary && (
                  <p className="mt-1 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {h.summary}
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
