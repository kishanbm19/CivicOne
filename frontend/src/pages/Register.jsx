import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Phone, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import Logo from "../components/common/Logo";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../api/axios";

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreeConsent, setAgreeConsent] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeConsent) {
      setError("Please agree to the privacy policy and consent guidelines to continue.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signUp({
        full_name: fullName,
        email,
        phone: phone || undefined,
        password,
      });
      navigate("/app");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <Logo />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Create Citizen Account
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          One unified identity to access transport, municipal, and healthcare civic services.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Full Legal Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ananya@example.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Contact Phone (Optional)
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="input pl-10"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Must contain at least 8 characters.</p>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeConsent}
                  onChange={(e) => setAgreeConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the CivicOne Privacy & Consent Terms. I understand that all complaints require manual address input and that no automatic GPS tracking is performed.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn py-3 text-sm font-bold shadow-md mt-2 flex items-center justify-center gap-2"
            >
              {submitting ? "Registering Account..." : "Create Citizen Account"}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>Public registration grants Citizen role only. Government staff are provisioned by administrators.</span>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-600">
          Already registered?{" "}
          <Link to="/login" className="font-bold text-blue-600 hover:underline">
            Sign in to Citizen Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
