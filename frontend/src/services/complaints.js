import api from "./axios";

export const listComplaints = async (params = {}) => {
  const res = await api.get("/complaints", { params });
  return res.data;
};

export const listComplaintStaffOptions = async (domain) => {
  const res = await api.get("/complaints/staff-options", {
    params: domain ? { domain } : {},
  });
  return res.data;
};

export const getComplaint = async (id) => {
  const res = await api.get(`/complaints/${id}`);
  return res.data;
};

export const createComplaint = async (data) => {
  const res = await api.post("/complaints", data);
  return res.data;
};

export const updateComplaintStatus = async (id, data) => {
  const res = await api.post(`/complaints/${id}/status`, data);
  return res.data;
};

export const assignComplaint = async (id, data) => {
  const res = await api.post(`/complaints/${id}/assign`, data);
  return res.data;
};

export const addInternalNote = async (id, note) => {
  const res = await api.post(`/complaints/${id}/notes`, { note });
  return res.data;
};

export const requestComplaintInformation = async (id, message) => {
  const res = await api.post(`/complaints/${id}/request-information`, { message });
  return res.data;
};

export const uploadComplaintEvidence = async (id, file, citizenVisible = true) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("citizen_visible", String(citizenVisible));
  const res = await api.post(`/complaints/${id}/evidence`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const uploadComplaintImage = async (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/complaints/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getComplaintImage = async (id) => {
  const res = await api.get(`/complaints/${id}/image`, { responseType: "blob" });
  return res.data;
};

export const downloadComplaintEvidence = async (id, evidenceId) => {
  const res = await api.get(`/complaints/${id}/evidence/${evidenceId}/download`, {
    responseType: "blob",
  });
  return res.data;
};

export const reopenComplaint = async (id, reason) => {
  const res = await api.post(`/complaints/${id}/reopen`, { reason });
  return res.data;
};
