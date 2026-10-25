import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, FileQuestion, ArrowLeft, Home } from "lucide-react";
import Logo from "../components/common/Logo";

export function Unauthorized() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-16 text-center text-slate-900">
      <div className="card p-8 sm:p-10 max-w-lg w-full border border-slate-200 space-y-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-rose-100 text-rose-600 mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Portal Access Restricted</h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          You are currently logged in with a <strong>Citizen account</strong>. The Government Portal is strictly restricted to authorized department staff and administrators.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <Link to="/" className="btn text-xs font-semibold py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white">
            Return Home
          </Link>
          <Link to="/app" className="btn-ghost text-xs font-semibold py-2.5 px-4 border border-slate-300 hover:bg-slate-100">
            Citizen Dashboard
          </Link>
          <Link
            to="/government/login"
            onClick={() => {
              localStorage.removeItem("co_token");
              localStorage.removeItem("co_refresh_token");
            }}
            className="btn text-xs font-semibold py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Sign in as Government Staff
          </Link>
        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-16 text-center text-slate-900">
      <div className="card p-8 sm:p-10 max-w-md w-full border border-slate-200 space-y-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-blue-600 mx-auto">
          <FileQuestion size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Page Not Found</h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          The civic service or portal page you are looking for does not exist or has been relocated.
        </p>
        <div className="pt-2">
          <Link to="/" className="btn text-xs font-semibold py-2 px-5 inline-flex items-center gap-1.5">
            <Home size={14} /> Back to CivicOne Home
          </Link>
        </div>
      </div>
    </div>
  );
}
