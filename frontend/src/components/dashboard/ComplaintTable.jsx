import React from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";
import PriorityBadge from "../common/PriorityBadge";
import { ChevronRight } from "lucide-react";

export default function ComplaintTable({ complaints = [], basePath = "/government/complaints", title = "My Assigned Complaints", viewAllLink = "/government/complaints" }) {
  const navigate = useNavigate();

  return (
    <div className="card overflow-hidden border border-slate-200/80">
      <div className="p-5 flex items-center justify-between border-b border-slate-100">
        <h3 className="font-bold text-slate-900 text-base">{title}</h3>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
          >
            View All <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50/75 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {complaints.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                  No complaints in this queue.
                </td>
              </tr>
            ) : (
              complaints.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`${basePath}/${item.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-blue-600 text-xs">
                    {item.reference}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {item.title}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {item.locality || item.address?.split(",")[0] || "Civic Area"}
                  </td>
                  <td className="py-3 px-4">
                    <PriorityBadge priority={item.priority} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">
                    {item.updated_text || "Recently"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
