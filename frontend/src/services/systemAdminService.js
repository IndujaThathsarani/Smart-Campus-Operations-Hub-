import apiClient from "./apiClient";

export const getSystemUsers = async () => {
  const response = await apiClient.get("/system-admin/users");
  return response.data;
};

export const getSystemStats = async () => {
  const response = await apiClient.get("/system-admin/stats");
  return response.data;
};

export const updateUserRoles = async (userId, roles) => {
  const response = await apiClient.patch(`/system-admin/users/${userId}/roles`, {
    roles,
  });
  return response.data;
};

export const updateUserStatus = async (userId, active) => {
  const response = await apiClient.patch(`/system-admin/users/${userId}/status`, {
    active,
  });
  return response.data;
};