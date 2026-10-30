import api from "./axios";

export const listPublicDocuments = async (params = {}) => {
  const res = await api.get("/documents/public", { params });
  return res.data;
};

export const listStaffDocuments = async (params = {}) => {
  const res = await api.get("/documents", { params });
  return res.data;
};

export const createDocument = async (data) => {
  const res = await api.post("/documents", data);
  return res.data;
};

export const uploadDocument = async (file, data) => {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });
  const res = await api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const updateDocument = async (id, data) => {
  const res = await api.patch(`/documents/${id}`, data);
  return res.data;
};

export const submitDocumentReview = async (id) => {
  const res = await api.post(`/documents/${id}/submit-review`);
  return res.data;
};

export const approveDocument = async (id) => {
  const res = await api.post(`/documents/${id}/approve`);
  return res.data;
};

export const requestDocumentChanges = async (id, message) => {
  const res = await api.post(`/documents/${id}/request-changes`, { message });
  return res.data;
};

export const rejectDocument = async (id, message) => {
  const res = await api.post(`/documents/${id}/reject`, { message });
  return res.data;
};

export const publishDocument = async (id) => {
  const res = await api.post(`/documents/${id}/publish`);
  return res.data;
};

export const unpublishDocument = async (id) => {
  const res = await api.post(`/documents/${id}/unpublish`);
  return res.data;
};
