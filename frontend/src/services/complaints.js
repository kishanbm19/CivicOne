import api from "./axios";

export const listComplaints = async (params = {}) => {
  const res = await api.get("/complaints", { params });
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

export const reopenComplaint = async (id, reason) => {
  const res = await api.post(`/complaints/${id}/reopen`, { reason });
  return res.data;
};

export const uploadComplaintImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/complaints/upload-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
