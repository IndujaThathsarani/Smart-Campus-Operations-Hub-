import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../constants/ticketOptions'
import { apiPostFormData } from '../../services/apiClient'

const MAX_ATTACHMENTS = 3

function formatSubmitError(err) {
  const msg = err?.body?.message
  if (typeof msg === 'string') return msg
  if (msg && typeof msg === 'object') {
    return Object.values(msg).join(' ')
  }
  return err?.message || 'Something went wrong.'
}

export default function TicketCreatePage() {
  const navigate = useNavigate()

  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const [submitPhase, setSubmitPhase] = useState('idle')
  const [submitError, setSubmitError] = useState(null)

  const [attachments, setAttachments] = useState([])
  const attachmentsRef = useRef(attachments)

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.url))
    }
  }, [])

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (incoming.length === 0) return

    setAttachments((prev) => {
      const next = [...prev]
      for (const file of incoming) {
        if (next.length >= MAX_ATTACHMENTS) break
        next.push({ file, url: URL.createObjectURL(file) })
      }
      return next
    })
  }

  function removeAttachment(index) {
    setAttachments((prev) => {
      const copy = [...prev]
      const [removed] = copy.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.url)
      return copy
    })
  }

  function handleFileChange(e) {
    addFiles(e.target.files)
    e.target.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const hasLocation = location.trim().length > 0
    const hasContact = contactEmail.trim().length > 0 || contactPhone.trim().length > 0

    if (!hasLocation || !hasContact || description.trim().length < 10) {
      return
    }

    setSubmitPhase('loading')
    setSubmitError(null)

    const formData = new FormData()
    formData.append('location', location.trim())
    formData.append('category', category)
    formData.append('priority', priority)
    formData.append('description', description.trim())
    const email = contactEmail.trim()
    const phone = contactPhone.trim()
    if (email) formData.append('contactEmail', email)
    if (phone) formData.append('contactPhone', phone)

    attachments.forEach((a) => {
      formData.append('files', a.file)
    })

    try {
      await apiPostFormData('/api/tickets', formData)
      setSubmitPhase('idle')

      attachments.forEach((a) => URL.revokeObjectURL(a.url))
      setAttachments([])
      setLocation('')
      setCategory('GENERAL')
      setDescription('')
      setPriority('MEDIUM')
      setContactEmail('')
      setContactPhone('')

      navigate('/tickets', { replace: false })
    } catch (err) {
      setSubmitPhase('error')
      setSubmitError(formatSubmitError(err))
    }
  }

  const canSubmit =
    location.trim().length > 0 &&
    (contactEmail.trim().length > 0 || contactPhone.trim().length > 0) &&
    description.trim().length >= 10

  const submitting = submitPhase === 'loading'

  return (
    <section className="max-w-2xl">
      <div className="mb-3">
        <Link to="/tickets" className="text-sm text-gray-600 hover:text-slate-900 hover:underline">
          ? Back to tickets
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-slate-900">New incident ticket</h1>

      {submitPhase === 'error' && submitError && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800" role="alert">
          {submitError}
        </p>
      )}

      <form className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit} noValidate>
        <h2 className="mb-5 text-[1.05rem] font-semibold text-gray-900">Report details</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className="text-sm font-medium text-gray-700">Location</label>
            <input
              id="location"
              type="text"
              autoComplete="off"
              placeholder="e.g. Block C, Level 2, corridor by stairs"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <p className="m-0 text-xs text-gray-500">Where the incident happened (building, room, area).</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="text-sm font-medium text-gray-700">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="priority" className="text-sm font-medium text-gray-700">Priority</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="description"
              required
              minLength={10}
              maxLength={4000}
              placeholder="Describe the issue (minimum 10 characters)."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              className="min-h-28 resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Preferred contact email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">Preferred contact phone</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+94 …"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <p className="m-0 text-xs text-gray-500">Provide at least email or phone.</p>
          </div>

          <div className="rounded-md border border-dashed border-slate-300 bg-gray-50 px-4 py-3">
            <label htmlFor="evidence" className="mb-1 block text-sm font-semibold text-gray-700">Evidence images</label>
            <p className="mb-3 text-xs text-gray-500">
              Up to {MAX_ATTACHMENTS} images (e.g. damage, error screen). Drag-and-drop is not required — use the file picker.
            </p>
            <div>
              <input
                id="evidence"
                type="file"
                accept="image/*"
                multiple
                disabled={submitting || attachments.length >= MAX_ATTACHMENTS}
                onChange={handleFileChange}
                className="max-w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-slate-800 disabled:cursor-not-allowed"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">{attachments.length} / {MAX_ATTACHMENTS} attached</p>

            {attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2.5">
                {attachments.map((a, index) => (
                  <div key={a.url} className="relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-200">
                    <img src={a.url} alt={a.file.name} className="block h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-base leading-none text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Remove image ${index + 1}`}
                      onClick={() => removeAttachment(index)}
                      disabled={submitting}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 border-t border-gray-200 pt-4">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'Submitting…' : 'Submit ticket'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

