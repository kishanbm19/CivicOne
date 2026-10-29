import React, { useState, useEffect } from "react";
import { Layers, Plus, Building, CheckCircle2, AlertCircle } from "lucide-react";
import { listOrganizations, listDepartments } from "../services/services";
import api, { errMsg } from "../services/axios";

export default function GovOrganizations() {
  const [organizations, setOrganizations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);

  // New Org inputs
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("transport");
  const [orgDesc, setOrgDesc] = useState("");

  // New Dept inputs
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptKey, setDeptKey] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([listOrganizations(), listDepartments()])
      .then(([oData, dData]) => {
        setOrganizations(oData || []);
        setDepartments(dData || []);
        if (oData?.length > 0) setSelectedOrgId(oData[0].id);
      })
      .catch((err) => console.error("Error loading organizations:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/admin/organizations", {
        name: orgName,
        domain: orgDomain,
        description: orgDesc || undefined,
      });
      setSuccess(`Organization "${orgName}" created.`);
      setShowOrgModal(false);
      setOrgName("");
      setOrgDesc("");
      loadData();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/admin/departments", {
        organization_id: selectedOrgId,
        name: deptName,
        category_key: deptKey,
      });
      setSuccess(`Department "${deptName}" created.`);
      setShowDeptModal(false);
      setDeptName("");
      setDeptKey("");
      loadData();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Organizations & Department Hierarchy
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage organization and department entities supporting cross-service domain isolation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOrgModal(true)}
            className="btn text-xs font-semibold"
          >
            <Plus size={15} /> Add Organization
          </button>
          <button
            onClick={() => setShowDeptModal(true)}
            className="btn-ghost text-xs font-semibold"
          >
            <Plus size={15} /> Add Department
          </button>
        </div>
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

      {/* Organizations & Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {organizations.map((org) => (
          <div key={org.id} className="card p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {org.domain}
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1">{org.name}</h3>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{org.description || "Civic service organization."}</p>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Departments ({org.departments?.length || 0}):
              </p>
              <div className="space-y-1.5">
                {(org.departments || []).map((d) => (
                  <div key={d.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                    <span className="font-medium text-slate-800">{d.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{d.category_key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Org */}
      {showOrgModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Add Organization</h3>
              <button onClick={() => setShowOrgModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateOrg} className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase text-slate-700 block mb-1">Organization Name</label>
                <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Metro Transit Board" className="input" />
              </div>
              <div>
                <label className="font-bold uppercase text-slate-700 block mb-1">Service Domain</label>
                <select value={orgDomain} onChange={(e) => setOrgDomain(e.target.value)} className="input">
                  <option value="transport">Transport</option>
                  <option value="municipal">Municipal</option>
                  <option value="healthcare">Healthcare</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowOrgModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dept */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Add Department</h3>
              <button onClick={() => setShowDeptModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase text-slate-700 block mb-1">Parent Organization</label>
                <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} className="input">
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold uppercase text-slate-700 block mb-1">Department Name</label>
                <input required value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Traffic Signal Maintenance" className="input" />
              </div>
              <div>
                <label className="font-bold uppercase text-slate-700 block mb-1">Category Key</label>
                <input required value={deptKey} onChange={(e) => setDeptKey(e.target.value)} placeholder="e.g. streetlight or general" className="input" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowDeptModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
