import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { listOrganizationConsentGrants } from "../services/services";
import { errMsg } from "../services/axios";

export default function GovConsentGrants() {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadGrants = () => {
    setLoading(true);
    setError(null);
    listOrganizationConsentGrants()
      .then(setGrants)
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGrants();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Citizen Consent Records
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            View consent grants made to your organization. These records do not grant access to citizen data.
          </p>
        </div>
        <button
          type="button"
          onClick={loadGrants}
          disabled={loading}
          className="btn-ghost self-start text-xs font-semibold flex items-center gap-2"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="card overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Citizen</th>
                <th className="px-4 py-3">Data Scope</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Granted</th>
                <th className="px-4 py-3">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Loading consent records...
                  </td>
                </tr>
              ) : grants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No consent grants have been made to your organization.
                  </td>
                </tr>
              ) : grants.map((grant) => (
                <tr key={grant.id} className="align-top">
                  <td className="px-4 py-3 font-semibold text-slate-900">{grant.citizen_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{grant.data_scope}</td>
                  <td className="px-4 py-3">{grant.purpose}</td>
                  <td className="px-4 py-3 capitalize">{grant.status}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(grant.granted_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {grant.expires_at ? new Date(grant.expires_at).toLocaleDateString() : "No expiry"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
