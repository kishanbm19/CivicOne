

export const COMPLAINT_STATUSES = [
  { value: "submitted", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

export const COMPLAINT_STATUS_TRANSITIONS = {
  submitted: ["assigned"],
  assigned: ["in_progress"],
  in_progress: ["resolved"],
  resolved: [],
};

const STATUS_STYLES = {
  submitted: "bg-slate-100 text-slate-700 border-slate-200",
  assigned: "bg-blue-50 text-blue-600 border-blue-200",
  in_progress: "bg-blue-50 text-blue-600 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unsupported: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function StatusBadge({ status }) {
  const normalizedStatus = status?.toLowerCase();
  const statusDefinition = COMPLAINT_STATUSES.find(
    (item) => item.value === normalizedStatus
  );
  const label = statusDefinition?.label || "Unsupported status";
  const style = STATUS_STYLES[statusDefinition?.value || "unsupported"];

  return (
    <span role={statusDefinition ? undefined : "alert"} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {label}
    </span>
  );
}
