import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, Calendar, ExternalLink } from "lucide-react";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "../api/services";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = () => {
    setLoading(true);
    listNotifications()
      .then((data) => setNotifications(data.items || []))
      .catch((err) => console.error("Error loading notifications:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  const handleMarkOne = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Notifications Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Status updates on your complaints, department circulars, and service advisories.
          </p>
        </div>
        <button
          onClick={handleMarkAll}
          className="btn-ghost text-xs font-semibold"
        >
          Mark all as read
        </button>
      </div>

      <div className="card divide-y divide-slate-100 border border-slate-200">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No notifications yet.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                !n.is_read ? "bg-blue-50/40" : "hover:bg-slate-50/60"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                  {!n.is_read && (
                    <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                  <Calendar size={12} /> {new Date(n.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.link && (
                  <Link
                    to={n.link}
                    onClick={() => handleMarkOne(n.id)}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View <ExternalLink size={13} />
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkOne(n.id)}
                    title="Mark as read"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
