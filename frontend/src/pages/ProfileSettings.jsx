import React, { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { changePassword, updateProfile } from "../services/auth";
import { errMsg } from "../services/axios";

export default function ProfileSettings() {
  const { user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setProfileSubmitting(true);
    try {
      await updateProfile({ full_name: fullName, phone: phone || null });
      await refreshProfile();
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setError("New passwords do not match.");
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const result = await changePassword({
        current_password: currentPw,
        new_password: newPw,
      });
      await signOut();
      navigate("/login", {
        replace: true,
        state: { message: result.message },
      });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Account Profile & Security Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your verified digital identity credentials and security preferences.
        </p>
      </div>

      {success && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card p-6 border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Digital Identity Details
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Email Address (verified):</span>
              <p className="font-mono text-slate-800 mt-0.5">{user?.email}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Account Role:</span>
              <p className="font-semibold text-blue-600 capitalize mt-0.5">{user?.role?.replace("_", " ")}</p>
            </div>
          </div>
          <form onSubmit={handleProfileUpdate} className="space-y-3 text-xs">
            <div>
              <label htmlFor="profile-name" className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Full Name</label>
              <input
                id="profile-name"
                type="text"
                required
                minLength={2}
                maxLength={150}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="profile-phone" className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Phone</label>
              <input
                id="profile-phone"
                type="tel"
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
              />
            </div>
            <button type="submit" disabled={profileSubmitting} className="btn text-xs font-semibold py-2 px-5 mt-2 disabled:opacity-50">
              {profileSubmitting ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        <div className="card p-6 border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Change Password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
            <div>
              <label htmlFor="current-password" className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Current Password</label>
              <input
                id="current-password"
                type="password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="font-bold uppercase tracking-wider text-slate-700 block mb-1">New Password</label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter password"
                className="input"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn text-xs font-semibold py-2 px-5 mt-2 disabled:opacity-50">
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
