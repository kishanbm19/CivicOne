import React, { useState, useEffect } from "react";
import { ShieldAlert, RefreshCw, Key, UserCheck, FileCheck, Layers } from "lucide-react";
import { getAuditLogs } from "../services/services";

export default function GovAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    setLoading(true);
    getAuditLogs(100)
      .then((data) => setLogs(data || []))
      .catch((err) => console.error("Error loading audit logs:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Security Audit Trail & Compliance Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Immutable system audit logs recording authentication, status changes, consent events, and publications.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="btn-ghost text-xs sm:text-sm font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh Logs
        </button>
      </div>

      <div className="card overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 text-xs">
                    Loading audit events...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 text-xs">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 font-mono text-xs">
                    <td className="py-3.5 px-4 font-bold text-blue-600">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800">
                      {log.actor_email || log.actor_id || "System"}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-600 font-sans">
                      {log.resource_type || "N/A"}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-600 max-w-xs truncate">
                      {log.details || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-sans text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
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
