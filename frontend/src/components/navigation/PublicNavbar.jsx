import React from "react";
import { Link } from "react-router-dom";
import { Shield, Lock } from "lucide-react";
import Logo from "../common/Logo";

export default function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        <Logo />

        {/* Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <Link to="/#services" className="hover:text-blue-600 transition-colors">Services</Link>
          <Link to="/#how-it-works" className="hover:text-blue-600 transition-colors">About</Link>
          <Link to="/#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</Link>
          <Link to="/help" className="hover:text-blue-600 transition-colors">Help</Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/login"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Citizen Login
          </Link>
          <Link
            to="/register"
            className="btn text-xs sm:text-sm"
          >
            Sign Up
          </Link>
          {/* Government Login: visually distinct with dark navy theme and lock icon */}
          <Link
            to="/government/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all border border-slate-700"
          >
            <Lock size={14} className="text-amber-400" />
            <span>Government Login</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
