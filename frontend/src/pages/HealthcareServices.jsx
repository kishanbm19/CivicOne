import React, { useState, useEffect } from "react";
import { Hospital, MapPin, Phone, Calendar, Clock, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { getFacilities, getAppointments, createAppointment } from "../api/services";
import { errMsg } from "../api/axios";

export default function HealthcareServices() {
  const [facilities, setFacilities] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);

  // Form inputs
  const [deptName, setDeptName] = useState("General Medicine");
  const [apptDate, setApptDate] = useState("2026-10-30");
  const [timeSlot, setTimeSlot] = useState("10:00 AM - 11:00 AM");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([getFacilities(), getAppointments()])
      .then(([fData, aData]) => {
        setFacilities(fData || []);
        setAppointments(aData || []);
        if (fData?.length > 0) setSelectedFacility(fData[0]);
      })
      .catch((err) => console.error("Healthcare services load error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedFacility) return;
    setError(null);
    setSubmitting(true);
    try {
      await createAppointment({
        facility_id: selectedFacility.id,
        department_name: deptName,
        appointment_date: apptDate,
        time_slot: timeSlot,
        reason,
      });
      setSuccess(`Appointment requested successfully at ${selectedFacility.name}.`);
      setShowBookingModal(false);
      setReason("");
      loadData();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Public Healthcare Services & Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Explore primary health centres, hospital facilities, and schedule demonstration clinic visits.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Facilities Directory */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Healthcare Facilities Directory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {facilities.map((fac) => (
            <div key={fac.id} className="card p-5 border border-slate-200/80 flex flex-col justify-between hover:shadow-elevated transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                    {fac.facility_type}
                  </span>
                  <span className="text-[11px] text-slate-400">{fac.locality}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{fac.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed flex items-start gap-1">
                  <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>{fac.address}</span>
                </p>
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-semibold block text-[11px] text-slate-400 uppercase">Services:</span>
                  {fac.services_offered}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedFacility(fac);
                    setShowBookingModal(true);
                  }}
                  className="w-full btn-healthcare text-xs py-2 rounded-xl font-semibold"
                >
                  Book Demo Visit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Demo Visits */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">My Scheduled Visits</h2>
        <div className="card overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Facility</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Date & Slot</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400 text-xs">
                      No scheduled demonstration appointments.
                    </td>
                  </tr>
                ) : (
                  appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{a.facility_name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{a.department_name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {a.appointment_date} ({a.time_slot})
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{a.reason}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 sm:p-8 max-w-md w-full border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Schedule Demo Visit</h3>
              <button onClick={() => setShowBookingModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleBook} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Facility</label>
                <input type="text" readOnly value={selectedFacility?.name || ""} className="input bg-slate-100" />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Clinic Department</label>
                <select value={deptName} onChange={(e) => setDeptName(e.target.value)} className="input">
                  <option value="General Medicine">General Medicine</option>
                  <option value="Pediatrics">Pediatrics & Child Care</option>
                  <option value="Immunization">Immunization & Vaccinations</option>
                  <option value="Diagnostics">Laboratory & Diagnostics</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Date</label>
                  <input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Time Slot</label>
                  <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="input">
                    <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                    <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                    <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                    <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Reason for Visit</label>
                <textarea rows={2} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Routine health check-up" className="input" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowBookingModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-healthcare">
                  {submitting ? "Booking..." : "Confirm Visit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
