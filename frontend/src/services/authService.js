import apiClient from "./apiClient";

export const getCurrentUser = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
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
  window.location.href = "http://localhost:8080/oauth2/authorization/google";
};