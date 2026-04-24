import { API_BASE_URL, apiGet, apiSend } from "./apiClient";

export const getCurrentUser = async () => {
  return apiGet("/api/auth/me");
};

export const getRoleRedirectPath = (roles = []) => {
  if (roles.includes("ROLE_SYSTEM_ADMIN")) {
    return "/system-admin/dashboard";
  }

  if (roles.includes("ROLE_ADMIN")) {
    return "/admin/catalogue";
  }

  if (roles.includes("ROLE_TECHNICIAN")) {
    return "/technician/tickets";
  }

  return "/resources";
};

export const loginWithGoogle = () => {
  window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
};

export const signup = async (email, password, name) => {
  return apiSend("/api/auth/signup", {
    method: "POST",
    body: { email, password, name },
  });
};

export const login = async (email, password) => {
  return apiSend("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
};

export const logout = async () => {
  return apiSend("/api/auth/logout", {
    method: "POST",
  });
};