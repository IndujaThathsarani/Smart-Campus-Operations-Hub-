import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, getRoleRedirectPath, loginWithGoogle, logout as logoutService } from "../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = async () => {
    try {
      const data = await getCurrentUser();

      if (data?.authenticated) {
        setUser(data);
        setRoles(data.roles || []);
      } else {
        setUser(null);
        setRoles([]);
      }
    } catch (error) {
      setUser(null);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const hasRole = (role) => roles.includes(role);

  const hasAnyRole = (allowedRoles = []) => {
    if (!allowedRoles.length) return true;
    return allowedRoles.some((role) => roles.includes(role));
  };

  const getDashboardPath = () => getRoleRedirectPath(roles);

  const logout = async () => {
    try {
      await logoutService();
    } finally {
      setUser(null);
      setRoles([]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        loading,
        isAuthenticated: Boolean(user),
        hasRole,
        hasAnyRole,
        getDashboardPath,
        loginWithGoogle,
        logout,
        refreshUser: loadCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};