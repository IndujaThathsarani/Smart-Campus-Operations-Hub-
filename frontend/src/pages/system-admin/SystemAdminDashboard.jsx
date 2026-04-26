import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Users, UserCog, UserCheck, UserX } from 'lucide-react'
import {
  getSystemStats,
  getSystemUsers,
  updateUserRoles,
  updateUserStatus,
} from '../../services/systemAdminService'

const ROLE_OPTIONS = [
  'ROLE_USER',
  'ROLE_TECHNICIAN',
  'ROLE_ADMIN',
  'ROLE_SYSTEM_ADMIN',
]

const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'users', label: 'User role management', icon: UserCog },
]

function roleLabel(role) {
  return String(role || 'ROLE_USER').replace('ROLE_', '').replaceAll('_', ' ')
}

function statusBadgeClass(active) {
  return active
    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
    : 'bg-rose-100 text-rose-800 ring-1 ring-rose-200'
}

const SystemAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [roleSelections, setRoleSelections] = useState({})
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [savingRoleUserId, setSavingRoleUserId] = useState(null)

  const loadDashboardData = async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        getSystemUsers(),
        getSystemStats(),
      ])

      setUsers(Array.isArray(usersData) ? usersData : [])
      setStats(statsData || null)
    } catch (error) {
      console.error('Failed to load system admin data:', error)
      setActionError('Failed to load system admin data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleRoleSelectChange = (userId, role) => {
    setActionError('')
    setActionSuccess('')
    setRoleSelections((prev) => ({
      ...prev,
      [userId]: role,
    }))
  }

  const handleRoleChange = async (userId, role) => {
    setActionError('')
    setActionSuccess('')
    setSavingRoleUserId(userId)

    try {
      await updateUserRoles(userId, [role])
      await loadDashboardData()
      setRoleSelections((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
      setActionSuccess('Role updated successfully.')
    } catch (error) {
      setActionError(error?.body?.message || 'Failed to update role. Please try again.')
    } finally {
      setSavingRoleUserId(null)
    }
  }

  const handleStatusChange = async (userId, active) => {
    setActionError('')
    setActionSuccess('')
    try {
      await updateUserStatus(userId, active)
      await loadDashboardData()
      setActionSuccess('User status updated successfully.')
    } catch (error) {
      setActionError(error?.body?.message || 'Failed to update user status. Please try again.')
    }
  }

  const statsCards = useMemo(() => {
    if (!stats) return []
    return [
      { key: 'total', label: 'Total users', value: stats.totalUsers ?? 0, icon: Users },
      { key: 'active', label: 'Active users', value: stats.activeUsers ?? 0, icon: UserCheck },
      { key: 'admins', label: 'Admins', value: stats.admins ?? 0, icon: ShieldCheck },
      { key: 'technicians', label: 'Technicians', value: stats.technicians ?? 0, icon: UserCog },
      { key: 'system-admins', label: 'System admins', value: stats.systemAdmins ?? 0, icon: UserX },
    ]
  }, [stats])

  const roleFilterOptions = useMemo(() => {
    const seen = new Set(ROLE_OPTIONS)
    users.forEach((user) => {
      if (Array.isArray(user.roles)) {
        user.roles.forEach((role) => {
          if (role) seen.add(role)
        })
      }
    })

    return ['ALL', ...Array.from(seen)]
  }, [users])

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'ALL') return users

    return users.filter((user) => {
      if (Array.isArray(user.roles) && user.roles.length > 0) {
        return user.roles.includes(roleFilter)
      }
      return roleFilter === 'ROLE_USER'
    })
  }, [roleFilter, users])

  if (loading) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
        Loading system admin dashboard...
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col overflow-x-hidden bg-slate-100 text-slate-900 md:h-[calc(100vh-4rem)] md:min-h-0 md:flex-row">
      <aside className="border-b border-slate-200 bg-slate-950 text-white md:flex md:h-full md:w-72 md:shrink-0 md:flex-col md:self-stretch md:border-b-0 md:border-r md:border-slate-800">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">System</p>
          <h1 className="mt-2 text-lg font-semibold text-white">Control &amp; access management</h1>
        </div>
        <nav
          aria-label="System admin tasks"
          className="flex flex-row gap-2 overflow-x-auto p-3 md:flex-1 md:flex-col md:justify-start md:gap-3 md:overflow-y-auto md:overflow-x-hidden md:px-3 md:py-6"
        >
          {DASHBOARD_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full shrink-0 rounded-xl px-4 py-3 text-center text-sm font-semibold transition md:text-left ${
                  isActive
                    ? 'bg-white/[0.14] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                  {tab.label}
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-x-hidden bg-slate-100 md:h-full">
        <div className="relative z-10 border-b border-slate-200 bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">System admin</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <ShieldCheck className="h-6 w-6 text-sky-700" strokeWidth={2.2} />
              {activeTab === 'overview' ? 'Dashboard overview' : 'User role management'}
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">Manage users, roles, and system-level access control.</p>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-3">
          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {actionError}
            </div>
          )}

          {actionSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
              {actionSuccess}
            </div>
          )}

          {!!statsCards.length && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {statsCards.map((card) => {
                const Icon = card.icon
                return (
                  <article
                    key={card.key}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                  >
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </div>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-1 text-3xl font-semibold leading-none text-slate-900">{card.value}</p>
                  </article>
                )
              })}
            </div>
          )}

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">User role management</h3>
                  <p className="mt-1 text-sm text-slate-600">Assign users to the correct role after sign-in.</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  Role filter
                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    {roleFilterOptions.map((role) => (
                      <option key={role} value={role}>
                        {role === 'ALL' ? 'All roles' : roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">User</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Email</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Role</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-600">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredUsers.map((user) => {
                    const currentRole = user.roles?.[0] || 'ROLE_USER'
                    const selectedRole = roleSelections[user.id] ?? currentRole
                    const hasPendingRoleChange = selectedRole !== currentRole

                    return (
                      <tr key={user.id} className="transition hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {user.profilePicture ? (
                              <img src={user.profilePicture} alt={user.name} className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-600">
                                {String(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900">{user.name || 'Unknown user'}</p>
                              <p className="text-xs text-slate-500">ID: {user.id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-600">{user.email}</td>

                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <select
                              value={selectedRole}
                              onChange={(event) => handleRoleSelectChange(user.id, event.target.value)}
                              className="w-full max-w-[14rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {roleLabel(role)}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-slate-500">Current: {roleLabel(currentRole)}</p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(user.active)}`}>
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {hasPendingRoleChange && (
                              <button
                                type="button"
                                onClick={() => handleRoleChange(user.id, selectedRole)}
                                disabled={savingRoleUserId === user.id}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingRoleUserId === user.id ? 'Saving...' : 'Confirm role'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStatusChange(user.id, !user.active)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
                            >
                              {user.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {!filteredUsers.length && (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-center text-slate-500">
                        {users.length
                          ? 'No users match the selected role filter.'
                          : 'No users found yet. Sign in with Google to create the first user.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default SystemAdminDashboard