import { apiGet, apiSend } from "./apiClient";

export const getSystemUsers = async () => {
  return apiGet("/api/system-admin/users");
};

export const getSystemStats = async () => {
  return apiGet("/api/system-admin/stats");
};

export const updateUserRoles = async (userId, roles) => {
  return apiSend(`/api/system-admin/users/${userId}/roles`, {
    method: "PATCH",
    body: { roles },
  });
};

export const updateUserStatus = async (userId, active) => {
  return apiSend(`/api/system-admin/users/${userId}/status`, {
    method: "PATCH",
    body: { active },
  });
};