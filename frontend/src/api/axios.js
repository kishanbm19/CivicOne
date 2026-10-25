import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("co_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("co_refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          if (res.data?.access_token) {
            localStorage.setItem("co_token", res.data.access_token);
            if (res.data?.refresh_token) {
              localStorage.setItem("co_refresh_token", res.data.refresh_token);
            }
            originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem("co_token");
          localStorage.removeItem("co_refresh_token");
          localStorage.removeItem("co_user");
        }
      }
    }
    return Promise.reject(error);
  }
);

export const errMsg = (err) => {
  if (err?.response?.data?.detail) {
    if (typeof err.response.data.detail === "string") {
      return err.response.data.detail;
    }
    if (Array.isArray(err.response.data.detail)) {
      return err.response.data.detail.map((d) => d.msg || d).join(", ");
    }
  }
  return err?.message || "An unexpected error occurred. Please try again.";
};

export default api;
