import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bus,
  Building2,
  HeartPulse,
  MapPin,
  Upload,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  Info
} from "lucide-react";
import { createComplaint, uploadComplaintImage } from "../services/complaints";
import { errMsg } from "../services/axios";

export default function NewComplaint() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState(searchParams.get("domain") || "transport");
  const [title, setTitle] = useState(searchParams.get("prefill") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "general");
  const [description, setDescription] = useState("");

  // Step 2: Address (Strictly manual - no GPS/geolocation APIs)
  const [address, setAddress] = useState("");
  const [locality, setLocality] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Submission state
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  // Category choices per domain
  const CATEGORIES = {
    transport: [
      { key: "bus_delay", label: "Bus Delay & Frequency" },
      { key: "bus_stop_damage", label: "Damaged Bus Stop / Shelter" },
      { key: "general", label: "Transit Infrastructure / Overcrowding" },
    ],
    municipal: [
      { key: "garbage", label: "Garbage & Waste Collection" },
      { key: "pothole", label: "Pothole & Damaged Road" },
      { key: "streetlight", label: "Faulty Streetlight" },
      { key: "water_supply", label: "Water Supply Interruption" },
      { key: "drainage", label: "Blocked Drainage & Sewage" },
      { key: "general", label: "General Municipal Issue" },
    ],
    healthcare: [
      { key: "facility_cleanliness", label: "Cleanliness & Sanitation" },
      { key: "equipment", label: "Non-functional Medical Equipment" },
      { key: "general", label: "Staff Availability / Wait Times" },
    ],
  };

  useEffect(() => {
    // If domain changes, ensure category is reset if not valid
    const validCats = CATEGORIES[domain]?.map((c) => c.key) || [];
    if (!validCats.includes(category)) {
      setCategory(validCats[0] || "general");
    }
  }, [domain]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImageUrl("");
    setUploadingImage(true);
    try {
      const res = await uploadComplaintImage(file);
      setImageUrl(res.image_url);
    } catch (err) {
      console.error("Complaint photo upload failed:", err);
      setError(`Photo could not be uploaded: ${errMsg(err)} You can choose another photo or submit without one.`);
    } finally {
      setUploadingImage(false);
    }
  };

  const validateStep1 = () => {
    if (title.trim().length < 5) {
      setError("Please enter a descriptive title (at least 5 characters).");
      return false;
    }
    if (description.trim().length < 10) {
      setError("Please describe the issue in detail (at least 10 characters).");
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (address.trim().length < 5) {
      setError("Please enter a manual street address or landmark (at least 5 characters).");
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (uploadingImage) {
      setError("Please wait for the photo upload to finish before submitting.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await createComplaint({
        domain,
        title,
        description,
        category,
        address,
        locality: locality || undefined,
        image_url: imageUrl || undefined,
      });
      setSuccessResult(res);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="card p-8 sm:p-12 border border-slate-200 text-center space-y-6">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Registered Successfully
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">
              Complaint Registered
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Your issue has been routed with reference ID:
            </p>
            <p className="mt-2 text-2xl font-mono font-black text-blue-600 tracking-wider bg-slate-50 py-2.5 px-6 rounded-2xl border border-slate-200 inline-block">
              {successResult.reference}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-left text-xs text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600" />
              AI Routing Status:
            </p>
            <p>
              Classified as: <span className="font-semibold">{successResult.category?.replace("_", " ")}</span> ({successResult.priority?.toUpperCase()} priority)
            </p>
            {successResult.department_name && (
              <p>Assigned Department: <span className="font-semibold">{successResult.department_name}</span></p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => navigate(`/app/complaints/${successResult.id}`)}
              className="btn text-sm font-semibold py-2.5 px-6"
            >
              View Complaint Details
            </button>
            <button
              onClick={() => navigate("/app/complaints")}
              className="btn-ghost text-sm font-semibold py-2.5 px-6"
            >
              Return to My Complaints
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Step Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Report a Civic Issue
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Multi-step address-based complaint submission with AI-assisted department routing.
        </p>

        {/* Wizard Steps */}
        <div className="mt-6 flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0"></div>
          {[
            { num: 1, label: "Issue Details" },
            { num: 2, label: "Manual Location" },
            { num: 3, label: "Review & AI Routing" },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-1 z-10 bg-slate-50 px-2">
              <div
                className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition-all ${
                  step === s.num
                    ? "bg-blue-600 text-white shadow-md ring-4 ring-blue-100"
                    : step > s.num
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-500 border border-slate-300"
                }`}
              >
                {step > s.num ? <CheckCircle2 size={16} /> : s.num}
              </div>
              <span className={`text-[11px] font-semibold ${
                step === s.num ? "text-blue-600 font-bold" : "text-slate-500"
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="card p-6 sm:p-8 border border-slate-200 space-y-6">
          {/* Domain Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Service Domain
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: "transport", label: "Transport Services", icon: Bus, activeBorder: "border-blue-500 bg-blue-50/60 text-blue-900" },
                { key: "municipal", label: "Municipal Services", icon: Building2, activeBorder: "border-emerald-500 bg-emerald-50/60 text-emerald-900" },
                { key: "healthcare", label: "Healthcare Services", icon: HeartPulse, activeBorder: "border-rose-500 bg-rose-50/60 text-rose-900" },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = domain === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setDomain(item.key)}
                    className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? `${item.activeBorder} ring-2 ring-blue-500/20 font-bold shadow-sm`
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    <Icon size={20} className={isSelected ? "text-blue-600" : "text-slate-500"} />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Complaint Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bus delay on Route 45 or Pothole on MG Road"
              className="input"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Issue Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input capitalize"
            >
              {(CATEGORIES[domain] || []).map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Detailed Description
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific details about the issue, timings, or safety risks..."
              className="input"
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="btn px-6 py-2.5 text-sm font-semibold"
            >
              Next: Location & Media <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Location & Media (Strictly Manual Address, No GPS) */}
      {step === 2 && (
        <div className="card p-6 sm:p-8 border border-slate-200 space-y-6">
          {/* Privacy Notice on No GPS */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Strict Manual Address Policy</p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                To protect citizen privacy, CivicOne does NOT access browser GPS, automatic coordinates, or live location tracking. Please manually input your street address or landmark below.
              </p>
            </div>
          </div>

          {/* Manual Address Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Street Address / Cross / Building (Manual Entry)
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 5th Main Road, Kuvempunagar, near Post Office"
                className="input pl-10"
              />
            </div>
          </div>

          {/* Locality or Ward */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Locality, Ward, or Landmark (Optional)
            </label>
            <input
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="e.g. Ward 12 or Kuvempunagar"
              className="input"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Attach Optional Photograph
            </label>
            <div className="mt-1 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors">
              <Upload size={24} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Click to upload or drag photograph
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                PNG, JPG or WEBP up to 5MB
              </p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageChange}
                className="mt-3 block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadingImage && <p className="text-xs text-blue-600 mt-2">Uploading photograph...</p>}
              {imageUrl && <p className="text-xs text-emerald-600 font-semibold mt-2">✓ Photo attached</p>}
              {!imageUrl && !uploadingImage && error?.startsWith("Photo could not be uploaded:") && (
                <p className="text-xs text-slate-600 mt-2">Photo is optional; you may continue without an attachment.</p>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-ghost text-xs sm:text-sm font-semibold"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="btn px-6 py-2.5 text-sm font-semibold"
            >
              Next: Review & Submit <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="card p-6 sm:p-8 border border-slate-200 space-y-6">
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
            <Sparkles size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
            <p className="text-xs font-bold text-blue-900">Complaint classification and routing</p>
              <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
              CivicOne will classify your report and route it to a matching department where possible. Uncertain or unassigned cases are sent for staff review. If the optional AI service is unavailable, rule-based classification is used.
              </p>
            </div>
          </div>

          {/* Summary Details */}
          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            <div className="py-3 flex justify-between">
              <span className="text-slate-500 font-medium">Service Domain:</span>
              <span className="font-bold text-slate-900 capitalize">{domain} Services</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500 font-medium">Title:</span>
              <span className="font-bold text-slate-900 text-right">{title}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500 font-medium">Category:</span>
              <span className="font-semibold text-slate-800 capitalize">{category.replace("_", " ")}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500 font-medium">Manual Address:</span>
              <span className="font-semibold text-slate-900 text-right max-w-xs">{address} {locality ? `(${locality})` : ""}</span>
            </div>
            <div className="py-3">
              <span className="text-slate-500 font-medium block mb-1">Description:</span>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{description}</p>
            </div>
            {imageUrl && (
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Attached Image:</span>
                <span className="text-emerald-600 font-semibold">1 Photograph Attached</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-ghost text-xs sm:text-sm font-semibold"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              disabled={submitting || uploadingImage}
              onClick={handleSubmit}
              className="btn px-8 py-3 text-sm font-bold shadow-md flex items-center gap-2"
            >
              {submitting ? "Submitting Issue..." : "Confirm & Submit Complaint"}
              <CheckCircle2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
