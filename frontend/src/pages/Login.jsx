import React, { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Mail, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import Logo from "../components/common/Logo";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../services/axios";

export default function Login({ portal = "citizen" }) {
  const isGov = portal === "government";
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await signIn({ email, password }, portal);
      if (isGov) {
        navigate("/government");
      } else {
        const next = searchParams.get("next") || "/app";
        navigate(next);
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 ${
      isGov ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    }`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <Logo light={isGov} />
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border">
          {isGov ? (
            <span className="bg-slate-800 text-amber-400 border-slate-700 flex items-center gap-1">
              <Lock size={12} /> Restricted Government Portal
            </span>
          ) : (
            <span className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
              <Sparkles size={12} /> Unified Citizen Portal
            </span>
          )}
        </div>
        <h2 className={`mt-3 text-2xl sm:text-3xl font-black tracking-tight ${
          isGov ? "text-white" : "text-slate-900"
        }`}>
          {isGov ? "Authorized Staff Sign In" : "Sign in to CivicOne"}
        </h2>
        <p className={`mt-1 text-xs sm:text-sm ${isGov ? "text-slate-400" : "text-slate-500"}`}>
          {isGov
            ? "Enter your provisioned government credentials to manage complaints."
            : "Access your unified citizen dashboard, track issues, and view notices."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className={`p-8 rounded-3xl shadow-elevated border ${
          isGov ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}>
          {location.state?.message && (
            <div role="status" className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              {location.state.message}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                isGov ? "text-slate-300" : "text-slate-700"
              }`}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isGov ? "staff@civicone.gov" : "citizen@example.com"}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none transition-all ${
                    isGov
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-xs font-bold uppercase tracking-wider ${
                  isGov ? "text-slate-300" : "text-slate-700"
                }`}>
                  Password
                </label>
                <Link
                  to="/password-reset"
                  className="text-xs font-semibold text-blue-500 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none transition-all ${
                    isGov
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                isGov
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              } disabled:opacity-50`}
            >
              {submitting ? "Signing In..." : isGov ? "Enter Staff Portal" : "Sign In to Citizen Portal"}
              <ArrowRight size={16} />
            </button>
          </form>


        </div>

        {/* Portal Switching & Registration Link */}
        <div className="mt-6 text-center text-xs space-y-2">
          {isGov ? (
            <p className="text-slate-400">
              Citizen user?{" "}
              <Link to="/login" className="font-bold text-blue-400 hover:underline">
                Go to Citizen Login
              </Link>
            </p>
          ) : (
            <>
              <p className="text-slate-600">
                Don't have an account?{" "}
                <Link to="/register" className="font-bold text-blue-600 hover:underline">
                  Create citizen account
                </Link>
              </p>
              <p className="text-slate-400">
                Government or department staff?{" "}
                <Link to="/government/login" className="font-bold text-slate-700 hover:underline">
                  Government Staff Portal
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
