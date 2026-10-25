import React, { useState, useEffect } from "react";
import { Shield, ShieldAlert, Plus, CheckCircle2, AlertCircle, Trash2, Clock, Building } from "lucide-react";
import { listConsentGrants, createConsentGrant, revokeConsentGrant, listOrganizations } from "../api/services";
import { errMsg } from "../api/axios";

export default function ConsentManagement() {
  const [grants, setGrants] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [dataScope, setDataScope] = useState("profile,synthetic_records");
  const [purpose, setPurpose] = useState("");
  const [validityDays, setValidityDays] = useState(365);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([listConsentGrants(), listOrganizations()])
      .then(([gData, oData]) => {
        setGrants(gData || []);
        setOrgs(oData || []);
        if (oData?.length > 0) setSelectedOrgId(oData[0].id);
      })
      .catch((err) => console.error("Consent load error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGrant = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createConsentGrant({
        recipient_organization_id: selectedOrgId,
        data_scope: dataScope,
        purpose,
        validity_days: parseInt(validityDays, 10),
      });
      setSuccess("Consent grant created and audit logged.");
      setShowGrantModal(false);
      setPurpose("");
      loadData();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (grantId) => {
    if (!window.confirm("Are you sure you want to revoke this consent? Access will immediately terminate.")) return;
    try {
      await revokeConsentGrant(grantId);
      setSuccess("Consent successfully revoked.");
      loadData();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Shield size={13} /> Privacy & Digital Sovereignty
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Consent & Data Sharing Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Explicitly authorize or revoke cross-service access to your citizen profile and synthetic health records.
          </p>
        </div>
        <button
          onClick={() => setShowGrantModal(true)}
          className="btn text-xs sm:text-sm font-semibold flex items-center gap-2"
        >
          <Plus size={16} /> Grant New Consent
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Grants Card */}
      <div className="card p-6 border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Authorized Data Grants
        </h2>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading consents...</div>
        ) : grants.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No active or historical consent grants found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {grants.map((g) => (
              <div key={g.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {g.recipient_organization_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        g.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {g.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Purpose:</span> {g.purpose}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Scope: <span className="font-mono text-slate-600">{g.data_scope}</span> • Granted: {new Date(g.granted_at).toLocaleDateString()}
                    {g.expires_at && ` • Expires: ${new Date(g.expires_at).toLocaleDateString()}`}
                  </p>
                </div>

                {g.status === "active" && (
                  <button
                    onClick={() => handleRevoke(g.id)}
                    className="self-start sm:self-auto text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors"
                  >
                    Revoke Access
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 sm:p-8 max-w-lg w-full border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Grant New Data Consent</h3>
              <button
                onClick={() => setShowGrantModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Recipient Civic Organization
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="input"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Data Scope
                </label>
                <input
                  type="text"
                  required
                  value={dataScope}
                  onChange={(e) => setDataScope(e.target.value)}
                  placeholder="e.g. profile,synthetic_records,commute_alerts"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Purpose of Sharing
                </label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Clinic booking notifications and emergency contact"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Validity Duration (Days)
                </label>
                <input
                  type="number"
                  min={30}
                  max={730}
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn text-xs font-semibold"
                >
                  {submitting ? "Granting..." : "Authorize Consent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
