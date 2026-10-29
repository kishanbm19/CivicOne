import { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, register as apiRegister, getMe, getStaffMe, logout as apiLogout } from "../services/auth";
import { listNotifications } from "../services/services";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchProfile = async () => {
    try {
      const u = await getMe();
      setUser(u);
      if (u.role !== "citizen") {
        try {
          const sp = await getStaffMe();
          setStaffProfile(sp);
        } catch (e) {
          console.error("Failed to load staff details:", e);
        }
      }
      try {
        const notifs = await listNotifications();
        setUnreadCount(notifs.unread_count || 0);
      } catch (e) {
        // notification fetch silent fail
      }
      return u;
    } catch (err) {
      localStorage.removeItem("co_token");
      localStorage.removeItem("co_refresh_token");
      setUser(null);
      setStaffProfile(null);
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("co_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetchProfile().finally(() => setLoading(false));
  }, []);

  const signIn = async (creds, portal = "citizen") => {
    const res = await apiLogin({ ...creds, portal });
    localStorage.setItem("co_token", res.access_token);
    if (res.refresh_token) {
      localStorage.setItem("co_refresh_token", res.refresh_token);
    }
    const profile = await fetchProfile();
    return profile;
  };

  const signUp = async (data) => {
    const res = await apiRegister(data);
    if (res.access_token) {
      localStorage.setItem("co_token", res.access_token);
      if (res.refresh_token) {
        localStorage.setItem("co_refresh_token", res.refresh_token);
      }
      const profile = await fetchProfile();
      return profile;
    }
    return res;
  };

  const signOut = async () => {
    await apiLogout();
    setUser(null);
    setStaffProfile(null);
    setUnreadCount(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        staffProfile,
        loading,
        unreadCount,
        setUnreadCount,
        signIn,
        signUp,
        signOut,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
