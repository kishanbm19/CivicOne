import api from "./axios";

// Healthcare & Civic Services
export const getFacilities = async () => {
  const res = await api.get("/services/facilities");
  return res.data;
};

export const getAppointments = async () => {
  const res = await api.get("/services/appointments");
  return res.data;
};

export const createAppointment = async (data) => {
  const res = await api.post("/services/appointments", data);
  return res.data;
};

// Consent Management
export const listConsentGrants = async () => {
  const res = await api.get("/consent");
  return res.data;
};

export const createConsentGrant = async (data) => {
  const res = await api.post("/consent", data);
  return res.data;
};

export const revokeConsentGrant = async (id) => {
  const res = await api.post(`/consent/${id}/revoke`);
  return res.data;
};

// Notifications
export const listNotifications = async () => {
  const res = await api.get("/notifications");
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await api.post(`/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.post("/notifications/read-all");
  return res.data;
};

// Analytics
export const getPublicStats = async () => {
  const res = await api.get("/analytics/public");
  return res.data;
};

export const getCitizenAnalytics = async () => {
  const res = await api.get("/analytics/citizen");
  return res.data;
};

export const getDepartmentAnalytics = async (domain) => {
  const res = await api.get("/analytics/department", {
    params: domain ? { domain } : {},
  });
  return res.data;
};

export const getPlatformAnalytics = async () => {
  const res = await api.get("/analytics/platform");
  return res.data;
};

// Admin
export const listOrganizations = async () => {
  const res = await api.get("/admin/organizations");
  return res.data;
};

export const listDepartments = async () => {
  const res = await api.get("/admin/departments");
  return res.data;
};

export const listStaff = async () => {
  const res = await api.get("/admin/staff");
  return res.data;
};

export const provisionStaff = async (data) => {
  const res = await api.post("/admin/staff", data);
  return res.data;
};

export const getAuditLogs = async (limit = 50) => {
  const res = await api.get("/admin/audit-logs", { params: { limit } });
  return res.data;
};
