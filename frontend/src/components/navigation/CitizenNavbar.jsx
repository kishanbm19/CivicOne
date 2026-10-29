import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, User, LogOut, ChevronDown, CheckCircle, ExternalLink, Shield } from "lucide-react";
import Logo from "../common/Logo";
import { useAuth } from "../../context/AuthContext";
import { markNotificationRead, markAllNotificationsRead } from "../../services/services";

export default function CitizenNavbar({ activeDomain = null }) {
  const { user, signOut, unreadCount, setUnreadCount } = useAuth();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "n-1",
      title: "Complaint Status: In Progress",
      message: "Bus delay on Route 45 (#T-2024-0012) is being investigated.",
      link: "/app/complaints",
      is_read: false,
      created_at: "2 hours ago"
    },
    {
      id: "n-2",
      title: "Notice: Route 45 Schedule Updated",
      message: "A revised timetable has been published for Route 45.",
      link: "/services/transport",
      is_read: false,
      created_at: "3 days ago"
    },
    {
      id: "n-3",
      title: "Free Health Check-up Camp",
      message: "Scheduled on Oct 28, 2026 at Community Centre.",
      link: "/services/healthcare",
      is_read: true,
      created_at: "4 days ago"
    }
  ]);

  const navLinks = [
    { label: "Home", to: "/app" },
    { label: "Services", to: "/services/transport" },
    { label: "My Complaints", to: "/app/complaints" },
    { label: "Notices", to: "/app/notices" },
    { label: "Consent", to: "/app/consent" },
    { label: "Help", to: "/app/help" },
  ];

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markNotificationRead(notif.id);
      } catch (e) {}
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setShowNotifs(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Logo />
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const isActive = location.pathname === item.to || (item.label === "Services" && location.pathname.startsWith("/services"));
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-blue-600 bg-blue-50/80 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs);
                setShowUserMenu(false);
              }}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-elevated border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 flex items-center justify-between border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.map((notif) => (
                    <Link
                      key={notif.id}
                      to={notif.link || "/app/complaints"}
                      onClick={() => handleItemClick(notif)}
                      className={`block px-4 py-3 hover:bg-slate-50 transition-colors ${
                        !notif.is_read ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900">{notif.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{notif.created_at}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                    </Link>
                  ))}
                </div>
                <div className="px-4 pt-2 border-t border-slate-100 text-center">
                  <Link
                    to="/app/notifications"
                    onClick={() => setShowNotifs(false)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Badge matching screenshot: Avatar "A", Name "Ananya Sharma", "Citizen" */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifs(false);
              }}
              className="flex items-center gap-2.5 p-1.5 pl-2 pr-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-sm">
                {(user?.full_name || "Ananya Sharma")[0]}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {user?.full_name || "Ananya Sharma"}
                </p>
                <p className="text-[11px] font-medium text-slate-500 capitalize">
                  {user?.role || "Citizen"}
                </p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white shadow-elevated border border-slate-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                  <p className="text-sm font-bold text-slate-900">{user?.full_name || "Ananya Sharma"}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <Link
                  to="/app/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <User size={15} /> Profile & Settings
                </Link>
                <Link
                  to="/app/consent"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Shield size={15} /> Consent Preferences
                </Link>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 text-left"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
