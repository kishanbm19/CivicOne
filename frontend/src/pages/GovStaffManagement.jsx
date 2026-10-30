import React, { useState, useEffect } from "react";
import { Users, UserPlus, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { listStaff, provisionStaff, listDepartments, updateStaffMembership } from "../services/services";
import { errMsg } from "../services/axios";
import { useAuth } from "../context/AuthContext";

export default function GovStaffManagement() {
  const { staffProfile } = useAuth();
  const canManageStaff = staffProfile?.permissions?.can_manage_staff;
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Provision inputs
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [deptId, setDeptId] = useState("");
  const [roleInDept, setRoleInDept] = useState("staff");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [savingMembership, setSavingMembership] = useState("");
  const [membershipRoles, setMembershipRoles] = useState({});

  const loadData = () => {
    setLoading(true);
    Promise.all([listStaff(), listDepartments()])
      .then(([sData, dData]) => {
        setStaff(sData || []);
        setMembershipRoles(Object.fromEntries((sData || []).map((member) => [member.membership_id, member.role_in_dept])));
        setDepartments(dData || []);
        if (dData?.length > 0) setDeptId(dData[0].id);
      })
      .catch((err) => console.error("Error loading staff:", err))
      .finally(() => setLoading(false));
  };

  const handleMembershipUpdate = async (member, isActive = member.is_active) => {
    setError(null);
    setSuccess(null);
    setSavingMembership(member.membership_id);
    try {
      await updateStaffMembership(member.membership_id, {
        role_in_dept: membershipRoles[member.membership_id] || member.role_in_dept,
        is_active: isActive,
      });
      setSuccess(`Department membership for ${member.full_name} updated.`);
      loadData();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSavingMembership("");
    }
  };

  useEffect(() => {
    if (canManageStaff) loadData();
  }, [canManageStaff]);

  const handleProvision = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await provisionStaff({
        full_name: fullName,
        email,
        password,
        role,
        department_id: deptId,
        role_in_dept: roleInDept,
      });
      setSuccess(`Staff account for ${email} successfully provisioned.`);
      setShowModal(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setRoleInDept("staff");
      loadData();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Staff & Department Membership Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Provision authorized government responders and manage department role assignments.
          </p>
        </div>
        {canManageStaff && <button
          onClick={() => setShowModal(true)}
          className="btn text-xs sm:text-sm font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus size={16} /> Provision Staff Member
        </button>}
      </div>

      {!canManageStaff && (
        <div className="card p-6 text-sm text-slate-600 border border-slate-200">
          You do not have department staff-management permissions.
        </div>
      )}

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

      {/* Staff Table */}
      <div className="card overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Department</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Platform Role</th>
                <th className="py-3 px-4">Department Role</th>
                <th className="py-3 px-4">Membership</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                    Loading staff memberships...
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                    No active staff memberships found.
                  </td>
                </tr>
              ) : (
                staff.map((m) => (
                  <tr key={m.membership_id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {m.full_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {m.email}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {m.department_name}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-600">
                      {m.domain || "Civic"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                        {m.role?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={membershipRoles[m.membership_id] || m.role_in_dept}
                        onChange={(e) => setMembershipRoles((roles) => ({
                          ...roles,
                          [m.membership_id]: e.target.value,
                        }))}
                        className="input text-xs"
                      >
                        <option value="staff">Staff</option>
                        <option value="supervisor">Manager / Supervisor</option>
                        <option value="department_admin">Department Admin</option>
                        <option value="public_information_officer">Public Information Officer</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={m.is_active ? "text-emerald-700" : "text-slate-400"}>
                        {m.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleMembershipUpdate(m)}
                        disabled={savingMembership === m.membership_id}
                        className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50"
                      >
                        {savingMembership === m.membership_id
                          ? "Saving..."
                          : "Save Role"}
                      </button>
                      <button
                        onClick={() => handleMembershipUpdate(m, !m.is_active)}
                        disabled={savingMembership === m.membership_id}
                        className="ml-3 text-xs font-semibold text-slate-600 hover:underline disabled:opacity-50"
                      >
                        {m.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provisioning Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 sm:p-8 max-w-lg w-full border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Provision New Government Staff Account</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleProvision} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Officer Vikram Sen"
                  className="input"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Government Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vikram@demo.civicone.test"
                  className="input"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Department</label>
                  <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="input">
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.domain})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
                    <option value="staff">Department Staff</option>
                    <option value="dept_admin">Department Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Department Role</label>
                <select value={roleInDept} onChange={(e) => setRoleInDept(e.target.value)} className="input">
                  <option value="staff">Staff</option>
                  <option value="supervisor">Manager / Supervisor</option>
                  <option value="department_admin">Department Admin</option>
                  <option value="public_information_officer">Public Information Officer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn">
                  {submitting ? "Provisioning..." : "Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
