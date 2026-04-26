export const MAX_ATTACHMENTS = 3
export const MAX_SUBJECT_LENGTH = 160
export const MAX_DESCRIPTION_LENGTH = 4000

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[0-9()\-\s.]{7,20}$/

export function validateTicketForm({
  subject,
  location,
  description,
  contactEmail,
  contactPhone,
  attachments,
}) {
  const errors = {}
  const trimmedSubject = String(subject || '').trim()
  const trimmedLocation = String(location || '').trim()
  const trimmedDescription = String(description || '').trim()
  const trimmedEmail = String(contactEmail || '').trim()
  const trimmedPhone = String(contactPhone || '').trim()

  if (!trimmedSubject) {
    errors.subject = 'Subject is required.'
  } else if (trimmedSubject.length > MAX_SUBJECT_LENGTH) {
    errors.subject = `Subject must be at most ${MAX_SUBJECT_LENGTH} characters.`
  }

  if (!trimmedLocation) {
    errors.location = 'Location is required.'
  }

  if (!trimmedDescription) {
    errors.description = 'Description is required.'
  } else if (trimmedDescription.length < 10) {
    errors.description = 'Description must be at least 10 characters.'
  } else if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`
  }

  if (!trimmedEmail && !trimmedPhone) {
    errors.contact = 'Provide at least an email or a phone number.'
  }

  if (trimmedEmail && !EMAIL_PATTERN.test(trimmedEmail)) {
    errors.contactEmail = 'Enter a valid email address.'
  }

  if (trimmedPhone && !PHONE_PATTERN.test(trimmedPhone)) {
    errors.contactPhone = 'Enter a valid phone number.'
  }

  if (Array.isArray(attachments) && attachments.length > MAX_ATTACHMENTS) {
    errors.attachments = `You can attach up to ${MAX_ATTACHMENTS} images.`
  }

  return errors
}

export function inspectTicketAttachments(fileList, currentCount) {
  const files = Array.from(fileList || [])
  const remainingSlots = Math.max(0, MAX_ATTACHMENTS - Number(currentCount || 0))
  const imageFiles = files.filter((file) => String(file.type || '').startsWith('image/'))
  const nonImageCount = files.length - imageFiles.length
  const acceptedFiles = imageFiles.slice(0, remainingSlots)
  const skippedForLimit = Math.max(0, imageFiles.length - acceptedFiles.length)

  let message = ''
  if (nonImageCount > 0 && skippedForLimit > 0) {
    message = `Only images are allowed, and only ${remainingSlots} more attachment${remainingSlots === 1 ? '' : 's'} can be added.`
  } else if (nonImageCount > 0) {
    message = 'Only image files are allowed.'
  } else if (skippedForLimit > 0) {
    message = `You can attach up to ${MAX_ATTACHMENTS} images only.`
  }

  return {
    acceptedFiles,
    message,
  }
}
