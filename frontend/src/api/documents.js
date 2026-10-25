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

export const submitDocumentReview = async (id) => {
  const res = await api.post(`/documents/${id}/submit-review`);
  return res.data;
};

export const approveDocument = async (id) => {
  const res = await api.post(`/documents/${id}/approve`);
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
