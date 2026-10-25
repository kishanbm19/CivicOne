import { Link } from "react-router-dom";
import { Bus, Building2, HeartPulse, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
export const DOMAINS = {
  transport: { label: "Transport Services", icon: Bus, bg: "bg-blue-50", fg: "text-blue-600", cats: ["bus_delay", "bus_stop_damage", "general"] },
  municipal: { label: "Municipal Services", icon: Building2, bg: "bg-green-50", fg: "text-green-600", cats: ["garbage", "pothole", "streetlight", "water_supply", "drainage", "general"] },
  healthcare: { label: "Healthcare Services", icon: HeartPulse, bg: "bg-rose-50", fg: "text-rose-600", cats: ["facility_cleanliness", "equipment", "general"] },
};
const COLORS = { submitted: "bg-slate-100 text-slate-700", assigned: "bg-blue-100 text-blue-700", acknowledged: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700", on_hold: "bg-orange-100 text-orange-700", resolved: "bg-green-100 text-green-700",
  closed: "bg-slate-200 text-slate-600", reopened: "bg-rose-100 text-rose-700", classified: "bg-cyan-100 text-cyan-700" };
export const StatusBadge = ({ s }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORS[s] || COLORS.submitted}`}>{s.replace("_", " ")}</span>;
export const Logo = ({ light }) => <Link to="/" className={`flex items-center gap-2 font-extrabold text-lg ${light ? "text-white" : "text-slate-900"}`}><span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white text-sm">C</span>CivicOne</Link>;
export function Shell({ gov, children, title }) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen md:flex">
      <aside className={`${gov ? "bg-gov" : "bg-white border-r border-slate-100"} md:w-60 p-4 flex md:flex-col justify-between`}>
        <div><Logo light={gov} /></div>
        <button onClick={signOut} className={`flex items-center gap-2 text-sm ${gov ? "text-white/80" : "text-slate-500"}`}><LogOut size={16} />Sign out</button>
      </aside>
      <main className="flex-1 p-6"><div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold">{title}</h1><span className="text-sm text-slate-500">{user?.full_name}</span></div>{children}</main>
    </div>);
}
