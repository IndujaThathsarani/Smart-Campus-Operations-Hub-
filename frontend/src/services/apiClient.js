const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

async function parseJsonSafe(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  })
  const body = await parseJsonSafe(response)
  if (!response.ok) {
    const err = new Error(response.statusText || 'Request failed')
    err.status = response.status
    err.body = body
    throw err
  }
  return body
}

export async function apiSend(path, { method = 'GET', headers = {}, body } = {}) {
  const init = {
    method,
    headers: { Accept: 'application/json', ...headers },
  }
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }
  const response = await fetch(`${API_BASE_URL}${path}`, init)
  const parsed = await parseJsonSafe(response)
  if (!response.ok) {
    const err = new Error(response.statusText || 'Request failed')
    err.status = response.status
    err.body = parsed
    throw err
  }
  return parsed
}

export { API_BASE_URL }
