import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../constants/ticketOptions'
// import { useResources } from '../../hooks/useResources'
import { apiPostFormData } from '../../services/apiClient'
import './TicketsPage.css'

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
  // const { resources, loading: resourcesLoading, loadError: resourcesLoadError } = useResources()

  // const [resourceId, setResourceId] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const [submitPhase, setSubmitPhase] = useState('idle')
  const [submitError, setSubmitError] = useState(null)

  /** @type {[{ file: File, url: string }]} */
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
    // const hasResource = Boolean(resourceId)
    const hasLocation = location.trim().length > 0
    const hasContact =
      contactEmail.trim().length > 0 || contactPhone.trim().length > 0

    if (!hasLocation || !hasContact || description.trim().length < 10) {
      return
    }

    setSubmitPhase('loading')
    setSubmitError(null)

    const formData = new FormData()
    // if (resourceId) {
    //   formData.append('resourceId', resourceId)
    // }
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
      // setResourceId('')
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

  // When resource field is restored: (Boolean(resourceId) || location.trim().length > 0) && …
  const canSubmit =
    location.trim().length > 0 &&
    (contactEmail.trim().length > 0 || contactPhone.trim().length > 0) &&
    description.trim().length >= 10

  const submitting = submitPhase === 'loading'

  return (
    <section className="tickets-page">
      <div className="ticket-create-nav">
        <Link to="/tickets" className="ticket-back-link">
          ← Back to tickets
        </Link>
      </div>

      <h1 className="page-title">New incident ticket</h1>

      {/* {resourcesLoadError && (
        <p className="form-banner form-banner--warn" role="status">
          {resourcesLoadError}
        </p>
      )} */}

      {submitPhase === 'error' && submitError && (
        <p className="form-banner form-banner--err" role="alert">
          {submitError}
        </p>
      )}

      <form className="ticket-form" onSubmit={handleSubmit} noValidate>
        <h2 className="ticket-form-heading">Report details</h2>
        <div className="form-stack">
          {/* Resource (catalogue) — restore when catalogue API is ready:
          <div className="form-field">
            <label htmlFor="resource">Resource (from catalogue)</label>
            <select
              id="resource"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              disabled={submitting || resourcesLoading}
            >
              <option value="">— None —</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.location}
                </option>
              ))}
            </select>
            <p className="hint">Optional if you describe the location below.</p>
          </div>
          */}

          <div className="form-field">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              autoComplete="off"
              placeholder="e.g. Block C, Level 2, corridor by stairs"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={submitting}
            />
            <p className="hint">Where the incident happened (building, room, area).</p>
          </div>

          <div className="form-field">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={submitting}
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              required
              minLength={10}
              maxLength={4000}
              placeholder="Describe the issue (minimum 10 characters)."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-field">
            <label htmlFor="email">Preferred contact email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-field">
            <label htmlFor="phone">Preferred contact phone</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+94 …"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={submitting}
            />
            <p className="hint">Provide at least email or phone.</p>
          </div>

          <div className="attachments-section">
            <label htmlFor="evidence">Evidence images</label>
            <p className="hint">
              Up to {MAX_ATTACHMENTS} images (e.g. damage, error screen). Drag-and-drop is not
              required — use the file picker.
            </p>
            <div className="file-input-wrap">
              <input
                id="evidence"
                type="file"
                accept="image/*"
                multiple
                disabled={submitting || attachments.length >= MAX_ATTACHMENTS}
                onChange={handleFileChange}
              />
            </div>
            <p className="attachment-count">
              {attachments.length} / {MAX_ATTACHMENTS} attached
            </p>
            {attachments.length > 0 && (
              <div className="preview-grid">
                {attachments.map((a, index) => (
                  <div key={a.url} className="preview-item">
                    <img src={a.url} alt={a.file.name} />
                    <button
                      type="button"
                      className="preview-remove"
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

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={!canSubmit || submitting}>
              {submitting ? 'Submitting…' : 'Submit ticket'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
