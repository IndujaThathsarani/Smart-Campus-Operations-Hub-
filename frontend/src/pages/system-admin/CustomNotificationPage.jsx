import { useMemo, useState } from 'react'
import { BellRing, Send, ShieldCheck } from 'lucide-react'
import { sendCustomNotification } from '../../services/systemAdminService'

const ROLE_OPTIONS = [
  { value: 'ROLE_USER', label: 'Users' },
  { value: 'ROLE_TECHNICIAN', label: 'Technicians' },
  { value: 'ROLE_ADMIN', label: 'Admins' },
  { value: 'ROLE_SYSTEM_ADMIN', label: 'System admins' },
]

const DEFAULT_FORM = {
  roles: ['ROLE_USER'],
  title: '',
  message: '',
  scheduleMode: 'NOW',
  scheduledAt: '',
}

export default function CustomNotificationPage() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedRoleCount = useMemo(() => form.roles.length, [form.roles])

  const toggleRole = (role) => {
    setError('')
    setSuccess('')
    setForm((prev) => {
      const nextRoles = prev.roles.includes(role)
        ? prev.roles.filter((item) => item !== role)
        : [...prev.roles, role]
      return { ...prev, roles: nextRoles }
    })
  }

  const handleChange = (field, value) => {
    setError('')
    setSuccess('')
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.roles.length) {
      setError('Select at least one target role.')
      return
    }

    const title = form.title.trim()
    const message = form.message.trim()
    if (!title || !message) {
      setError('Title and message are required.')
      return
    }

    if (form.scheduleMode === 'SCHEDULED') {
      if (!form.scheduledAt) {
        setError('Please select a schedule date and time.')
        return
      }

      const scheduledDate = new Date(form.scheduledAt)
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        setError('Scheduled time must be in the future.')
        return
      }
    }

    setLoading(true)
    try {
      await sendCustomNotification({
        roles: form.roles,
        title,
        message,
        scheduleMode: form.scheduleMode,
        scheduledAt: form.scheduleMode === 'SCHEDULED' ? form.scheduledAt : null,
      })
      setSuccess(form.scheduleMode === 'SCHEDULED' ? 'Custom notification scheduled successfully.' : 'Custom notification sent successfully.')
      setForm(DEFAULT_FORM)
    } catch (err) {
      setError(err?.body?.message || err?.message || 'Failed to send custom notification.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-8">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-900 px-6 py-6 text-white sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-200">System admin</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-200 shadow-sm ring-1 ring-white/10">
              <BellRing className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Custom notifications</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                Send targeted alerts to users, technicians, admins, or any combination of roles.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
              {success}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="title">
                  Notification title
                </label>
                <input
                  id="title"
                  value={form.title}
                  onChange={(event) => handleChange('title', event.target.value)}
                  placeholder="e.g. Maintenance window tomorrow"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  value={form.message}
                  onChange={(event) => handleChange('message', event.target.value)}
                  rows={6}
                  placeholder="Write a clear message for the selected recipients."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="scheduleMode">
                    Notification schedule
                  </label>
                  <select
                    id="scheduleMode"
                    value={form.scheduleMode}
                    onChange={(event) => handleChange('scheduleMode', event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="NOW">Send now</option>
                    <option value="SCHEDULED">Schedule for later</option>
                  </select>
                </div>

                {form.scheduleMode === 'SCHEDULED' && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="scheduledAt">
                      Schedule date and time
                    </label>
                    <input
                      id="scheduledAt"
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(event) => handleChange('scheduledAt', event.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-sky-700" />
                Target roles
              </div>
              <p className="mt-1 text-sm text-slate-600">Choose one or more recipient groups.</p>

              <div className="mt-4 grid gap-3">
                {ROLE_OPTIONS.map((option) => {
                  const active = form.roles.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleRole(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${active ? 'border-sky-300 bg-sky-50 text-sky-900 ring-1 ring-sky-200' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{option.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${active ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {active ? 'Selected' : 'Tap'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Selected roles</p>
                <p className="mt-1">{selectedRoleCount ? form.roles.join(', ') : 'None selected'}</p>
              </div>
            </aside>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <p className="text-sm text-slate-500">
              {form.scheduleMode === 'SCHEDULED'
                ? 'Scheduled notifications are queued and sent at the selected time.'
                : 'Notifications are delivered instantly to active users in the selected roles.'}
            </p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Sending...' : 'Send notification'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
