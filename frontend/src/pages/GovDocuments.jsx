import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  FileText,
  Plus,
  Upload,
  CheckCircle2,
  Clock,
  Archive,
  Eye,
  AlertCircle,
  FileCheck,
  Send
} from "lucide-react";
import {
  listStaffDocuments,
  createDocument,
  submitDocumentReview,
  approveDocument,
  publishDocument,
  unpublishDocument
} from "../services/documents";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../services/axios";

export default function GovDocuments() {
  const { user } = useAuth();
  const outletCtx = useOutletContext() || {};
  const activeDomain = outletCtx.domain || "transport";

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form inputs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("announcement");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const canApproveOrPublish = user?.role === "dept_admin" || user?.role === "platform_admin";

  const loadDocuments = () => {
    setLoading(true);
    listStaffDocuments({ domain: activeDomain })
      .then((data) => setDocuments(data || []))
      .catch((err) => console.error("Error loading staff documents:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDocuments();
  }, [activeDomain]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createDocument({
        title,
        description,
        service_domain: activeDomain,
        category,
        is_public: isPublic,
      });
      setSuccess("New draft notice created.");
      setShowUploadModal(false);
      setTitle("");
      setDescription("");
      loadDocuments();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (id) => {
    try {
      await submitDocumentReview(id);
      setSuccess("Document submitted for administrative review.");
      loadDocuments();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveDocument(id);
      setSuccess("Document approved.");
      loadDocuments();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishDocument(id);
      setSuccess("Document published to public circulars.");
      loadDocuments();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleArchive = async (id) => {
    try {
      await unpublishDocument(id);
      setSuccess("Document archived.");
      loadDocuments();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (activeTab === "all") return true;
    return d.status === activeTab;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Government Document & Notice Publishing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Author, review, approve, and publish verified public service notices following 4-stage governance.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn text-xs sm:text-sm font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} /> Create Notice / Document
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

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
        {[
          { label: "All Documents", value: "all" },
          { label: "Drafts", value: "draft" },
          { label: "Under Review", value: "review" },
          { label: "Approved", value: "approved" },
          { label: "Published", value: "published" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === tab.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <div className="card overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 text-xs">
                    Loading department documents...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 text-xs">
                    No documents found in this status.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-sm">
                      <p className="truncate font-bold">{doc.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{doc.description}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium capitalize text-slate-600">
                      {doc.service_domain}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 capitalize">
                      {doc.category?.replace("_", " ")}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${
                        doc.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : doc.status === "approved"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : doc.status === "review"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {doc.author_name || "Staff"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {/* Stage 1: Draft -> Submit for review */}
                        {doc.status === "draft" && (
                          <button
                            onClick={() => handleSubmitReview(doc.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            Submit Review
                          </button>
                        )}

                        {/* Stage 2: Under Review -> Approve (Admin) */}
                        {doc.status === "review" && canApproveOrPublish && (
                          <button
                            onClick={() => handleApprove(doc.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            Approve
                          </button>
                        )}

                        {/* Stage 3: Approved -> Publish (Admin) */}
                        {doc.status === "approved" && canApproveOrPublish && (
                          <button
                            onClick={() => handlePublish(doc.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            Publish
                          </button>
                        )}

                        {/* Published -> Archive */}
                        {doc.status === "published" && canApproveOrPublish && (
                          <button
                            onClick={() => handleArchive(doc.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            Unpublish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card p-6 sm:p-8 max-w-lg w-full border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Create Notice or Announcement</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Schedule Revision / Planned Maintenance Notice"
                  className="input"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Notice Description / Body</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Official circular information, effective dates, or advisory instructions..."
                  className="input"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Domain</label>
                  <input type="text" readOnly value={`${activeDomain} services`} className="input bg-slate-100 capitalize" />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-slate-700 block mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                    <option value="announcement">Announcement</option>
                    <option value="notice">Notice</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="alert">Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700">Intended for public distribution on citizen portal</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn">
                  {submitting ? "Saving..." : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
