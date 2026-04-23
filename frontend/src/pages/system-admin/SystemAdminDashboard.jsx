import { useEffect, useState } from "react";
import {
  getSystemStats,
  getSystemUsers,
  updateUserRoles,
  updateUserStatus,
} from "../../services/systemAdminService";

const ROLE_OPTIONS = [
  "ROLE_USER",
  "ROLE_TECHNICIAN",
  "ROLE_ADMIN",
  "ROLE_SYSTEM_ADMIN",
];

const SystemAdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        getSystemUsers(),
        getSystemStats(),
      ]);

      setUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load system admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRoleChange = async (userId, role) => {
    await updateUserRoles(userId, [role]);
    await loadDashboardData();
  };

  const handleStatusChange = async (userId, active) => {
    await updateUserStatus(userId, active);
    await loadDashboardData();
  };

  if (loading) {
    return <p className="p-6 text-sm font-semibold text-slate-600">Loading system admin dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">
          System Admin Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage users, roles, and system-level access control.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Active Users" value={stats.activeUsers} />
          <StatCard label="Admins" value={stats.admins} />
          <StatCard label="Technicians" value={stats.technicians} />
          <StatCard label="System Admins" value={stats.systemAdmins} />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">User Role Management</h2>
          <p className="mt-1 text-sm text-slate-600">
            Assign users to the correct role after Google sign-in.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left font-bold text-slate-600">User</th>
                <th className="px-5 py-3 text-left font-bold text-slate-600">Email</th>
                <th className="px-5 py-3 text-left font-bold text-slate-600">Role</th>
                <th className="px-5 py-3 text-left font-bold text-slate-600">Status</th>
                <th className="px-5 py-3 text-left font-bold text-slate-600">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((user) => {
                const currentRole = user.roles?.[0] || "ROLE_USER";

                return (
                  <tr key={user.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {user.profilePicture && (
                          <img
                            src={user.profilePicture}
                            alt={user.name}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        )}
                        <span className="font-semibold text-slate-900">{user.name}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">{user.email}</td>

                    <td className="px-5 py-4">
                      <select
                        value={currentRole}
                        onChange={(event) =>
                          handleRoleChange(user.id, event.target.value)
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role.replace("ROLE_", "")}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          user.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(user.id, !user.active)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                      >
                        {user.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!users.length && (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-slate-500">
                    No users found yet. Sign in with Google to create the first user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-2xl font-extrabold text-slate-900">{value ?? 0}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
};

export default SystemAdminDashboard;