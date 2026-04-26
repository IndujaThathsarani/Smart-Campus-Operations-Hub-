import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, FileImage, FileText, Send, TicketPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../constants/ticketOptions'
import { useResources } from '../../hooks/useResources'
import { apiPostFormData } from '../../services/apiClient'
import {
  inspectTicketAttachments,
  MAX_ATTACHMENTS,
  MAX_DESCRIPTION_LENGTH,
  MAX_SUBJECT_LENGTH,
  validateTicketForm,
} from './ticketFormValidation'

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

  const [subject, setSubject] = useState('')
  const [location, setLocation] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const [submitPhase, setSubmitPhase] = useState('idle')
  const [submitError, setSubmitError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [attachmentNotice, setAttachmentNotice] = useState('')

  // Fetch resources for optional linking in incident tickets (populates resource dropdown)
  // Array to store attached photo files and their preview URLs
  const [attachments, setAttachments] = useState([])
  const attachmentsRef = useRef(attachments)
  const { resources, loading: resourcesLoading, loadError: resourcesError } = useResources()

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.url))
    }
  }, [])

  // Function to add selected image files to the attachments array (up to MAX_ATTACHMENTS)
  function addFiles(fileList) {
    const { acceptedFiles, message } = inspectTicketAttachments(fileList, attachmentsRef.current.length)
    setAttachmentNotice(message)
    if (acceptedFiles.length === 0) return

    setAttachments((prev) => {
      const next = [...prev]
      for (const file of acceptedFiles) {
        if (next.length >= MAX_ATTACHMENTS) break
        next.push({ file, url: URL.createObjectURL(file) })
      }
      return next
    })
    setValidationErrors((prev) => ({ ...prev, attachments: undefined }))
  }

  // Function to remove a specific attachment by index and clean up its preview URL
  function removeAttachment(index) {
    setAttachments((prev) => {
      const copy = [...prev]
      const [removed] = copy.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.url)
      return copy
    })
    setAttachmentNotice('')
  }

  // Handler for file input change: adds selected files and resets input for re-selection
  function handleFileChange(e) {
    addFiles(e.target.files)
    e.target.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errors = validateTicketForm({
      subject,
      location,
      description,
      contactEmail,
      contactPhone,
      attachments,
    })
    setValidationErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitPhase('loading')
    setSubmitError(null)

    const formData = new FormData()
    formData.append('subject', subject.trim())
    formData.append('location', location.trim())
    // Append selected resource ID if chosen (links ticket to resource in backend)
    if (resourceId) formData.append('resourceId', resourceId)
    formData.append('category', category)
    formData.append('priority', priority)
    formData.append('description', description.trim())
    const email = contactEmail.trim()
    const phone = contactPhone.trim()
    if (email) formData.append('contactEmail', email)
    if (phone) formData.append('contactPhone', phone)

    // Append all attached photo files to the form data for upload
    attachments.forEach((a) => {
      formData.append('files', a.file)
    })

    try {
      await apiPostFormData('/api/tickets', formData)
      setSubmitPhase('idle')

      attachments.forEach((a) => URL.revokeObjectURL(a.url))
      setAttachments([])
      setSubject('')
      setLocation('')
      setResourceId('')
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
    Object.keys(
      validateTicketForm({
        subject,
        location,
        description,
        contactEmail,
        contactPhone,
        attachments,
      }),
    ).length === 0

  const submitting = submitPhase === 'loading'

  return (
    <section className="mx-auto flex h-full w-full max-w-xl min-h-0 flex-col">
      <div className="mb-2">
        <Link to="/tickets" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-slate-900 hover:underline">
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
          Back to tickets
        </Link>
      </div>

      <h1 className="mb-1.5 inline-flex items-center gap-2 text-xl font-semibold text-slate-900">
        <TicketPlus className="h-5 w-5 text-sky-700" strokeWidth={2.2} />
        New incident ticket
      </h1>

      {submitPhase === 'error' && submitError && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-relaxed text-red-800" role="alert">
          {submitError}
        </p>
      )}

      <form
        className="min-h-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-gray-900">
          <FileText className="h-4 w-4 text-slate-500" strokeWidth={2.2} />
          Report details
        </h2>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="subject" className="text-sm font-medium text-gray-700">Subject</label>
            <input
              id="subject"
              type="text"
              autoComplete="off"
              placeholder="Brief summary of the issue"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value)
                setValidationErrors((prev) => ({ ...prev, subject: undefined }))
              }}
              maxLength={MAX_SUBJECT_LENGTH}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 text-xs text-gray-500">{subject.trim().length} / {MAX_SUBJECT_LENGTH}</p>
              {validationErrors.subject && <p className="m-0 text-xs text-red-700">{validationErrors.subject}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="resourceId" className="text-sm font-medium text-gray-700">Resource (optional)</label>
            <select
              id="resourceId"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              disabled={submitting || resourcesLoading}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="">Not linked to a specific resource</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || 'Unnamed resource'} ({r.type || 'OTHER'})
                </option>
              ))}
            </select>
            {resourcesError && <p className="m-0 text-xs text-amber-700">{resourcesError}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className="text-sm font-medium text-gray-700">Location</label>
            <input
              id="location"
              type="text"
              autoComplete="off"
              placeholder="e.g. Block C, Level 2, corridor by stairs"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value)
                setValidationErrors((prev) => ({ ...prev, location: undefined }))
              }}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <p className="m-0 text-xs text-gray-500">Where the incident happened (building, room, area).</p>
            {validationErrors.location && <p className="m-0 text-xs text-red-700">{validationErrors.location}</p>}
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
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="Describe the issue (minimum 10 characters)."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setValidationErrors((prev) => ({ ...prev, description: undefined }))
              }}
              disabled={submitting}
              className="min-h-28 resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 text-xs text-gray-500">{description.trim().length} / {MAX_DESCRIPTION_LENGTH}</p>
              {validationErrors.description && <p className="m-0 text-xs text-red-700">{validationErrors.description}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Preferred contact email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={contactEmail}
              onChange={(e) => {
                setContactEmail(e.target.value)
                setValidationErrors((prev) => ({ ...prev, contactEmail: undefined, contact: undefined }))
              }}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            {validationErrors.contactEmail && <p className="m-0 text-xs text-red-700">{validationErrors.contactEmail}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">Preferred contact phone</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+94 …"
              value={contactPhone}
              onChange={(e) => {
                setContactPhone(e.target.value)
                setValidationErrors((prev) => ({ ...prev, contactPhone: undefined, contact: undefined }))
              }}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <p className="m-0 text-xs text-gray-500">Provide at least email or phone.</p>
            {validationErrors.contactPhone && <p className="m-0 text-xs text-red-700">{validationErrors.contactPhone}</p>}
            {validationErrors.contact && <p className="m-0 text-xs text-red-700">{validationErrors.contact}</p>}
          </div>

          <div className="rounded-md border border-dashed border-slate-300 bg-gray-50 px-3 py-2.5">
            <label htmlFor="evidence" className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileImage className="h-4 w-4 text-slate-500" strokeWidth={2.2} />
              Evidence images
            </label>
            <p className="mb-3 text-xs text-gray-500">
              Up to {MAX_ATTACHMENTS} images (e.g. damage, error screen). Drag-and-drop is not required — use the file picker.
            </p>
            <div>
              {/* File input for selecting photo attachments */}
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
            {attachmentNotice && <p className="mt-1 text-xs text-amber-700">{attachmentNotice}</p>}
            {validationErrors.attachments && <p className="mt-1 text-xs text-red-700">{validationErrors.attachments}</p>}

            {/* Grid to display previews of attached photos with remove buttons */}
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

          <div className="mt-1 border-t border-gray-200 pt-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!canSubmit || submitting}
            >
              <Send className="h-4 w-4" strokeWidth={2.2} />
              {submitting ? 'Submitting…' : 'Submit ticket'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}


