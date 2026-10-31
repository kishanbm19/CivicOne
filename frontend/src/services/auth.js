import api from "./axios";

export const register = async (data) => {
  const res = await api.post("/auth/register", data);
  return res.data;
};

export const login = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    localStorage.removeItem("co_token");
    localStorage.removeItem("co_refresh_token");
    localStorage.removeItem("co_user");
  }
};

export const getMe = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};

export const getStaffMe = async () => {
  const res = await api.get("/staff/me");
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await api.patch("/auth/profile", data);
  return res.data;
};

export const changePassword = async (data) => {
  const res = await api.post("/auth/password/change", data);
  return res.data;
};

export const requestPasswordReset = async (email) => {
  const res = await api.post("/auth/password-reset/request", { email });
  return res.data;
};

export const confirmPasswordReset = async (token, newPassword) => {
  const res = await api.post("/auth/password-reset/confirm", {
    token,
    new_password: newPassword,
  });
  return res.data;
};
