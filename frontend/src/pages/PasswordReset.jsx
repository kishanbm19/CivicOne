import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import Logo from "../components/common/Logo";
import { requestPasswordReset, confirmPasswordReset } from "../services/auth";
import { errMsg } from "../services/axios";

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Read the reset token silently from the URL (?token=...).
  const urlToken = searchParams.get("token");

  // If a token is present in the URL, jump straight to the confirm step.
  useEffect(() => {
    if (urlToken) {
      setStep(2);
    }
  }, [urlToken]);

  // Step 1: user submits their email to request a reset link.
  const handleRequest = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setStep(2); // show "check your email" notice
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: user has arrived via the reset link and sets a new password.
  const handleConfirm = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await confirmPasswordReset(urlToken, newPassword);
      setStep(3);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <Logo />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Reset Your Password
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Recover access to your unified CivicOne account securely.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white p-8 rounded-3xl shadow-elevated border border-slate-200">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Step 1: enter email ── */}
          {step === 1 && (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="citizen@demo.civicone.test"
                    className="input pl-10"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn py-2.5 text-sm font-bold shadow-md mt-2"
              >
                {loading ? "Sending Reset Link..." : "Send Reset Link"}
              </button>
            </form>
          )}

          {/* ── Step 2a: arrived from step 1 (no URL token) — show check-email notice ── */}
          {step === 2 && !urlToken && (
            <div className="text-center py-4 space-y-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-100 text-blue-600 mx-auto">
                <Mail size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Check Your Email</h3>
              <p className="text-xs text-slate-600">
                If an account exists for that address, a password reset link has
                been sent. Please check your inbox and follow the link to set a
                new password.
              </p>
              <button
                onClick={() => { setStep(1); setError(null); }}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Try a different address
              </button>
            </div>
          )}

          {/* ── Step 2b: arrived via reset link (?token=...) — show new-password form ── */}
          {step === 2 && urlToken && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="input pl-10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn py-2.5 text-sm font-bold shadow-md mt-2"
              >
                {loading ? "Resetting Password..." : "Update Password"}
              </button>
            </form>
          )}

          {/* ── Step 3: success ── */}
          {step === 3 && (
            <div className="text-center py-4 space-y-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Password Reset Successfully</h3>
              <p className="text-xs text-slate-600">
                Your credentials have been securely updated. You can now log into your citizen account.
              </p>
              <Link to="/login" className="btn w-full">
                Go to Sign In
              </Link>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-600">
          Remembered your password?{" "}
          <Link to="/login" className="font-bold text-blue-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
