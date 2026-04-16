const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

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
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    })
  } catch (e) {
    const err = new Error(
      `Cannot reach the API at ${API_BASE_URL}. Is the backend running?`,
    )
    err.body = { message: err.message }
    err.cause = e
    throw err
  }
  const body = await parseJsonSafe(response)
  if (!response.ok) {
    const err = new Error(response.statusText || 'Request failed')
    err.status = response.status
    err.body = body
    throw err
  }
  return body
}

export async function apiPostFormData(path, formData) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    })
  } catch (e) {
    const err = new Error(
      `Cannot reach the API at ${API_BASE_URL}. Start the Spring Boot backend (and MongoDB), or set VITE_API_BASE_URL if it runs elsewhere.`,
    )
    err.body = { message: err.message }
    err.cause = e
    throw err
  }
  const parsed = await parseJsonSafe(response)
  if (!response.ok) {
    const err = new Error(response.statusText || 'Request failed')
    err.status = response.status
    err.body = parsed
    throw err
  }
  return parsed
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

export async function apiDelete(path) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    })
  } catch (e) {
    const err = new Error(
      `Cannot reach the API at ${API_BASE_URL}. Is the backend running?`,
    )
    err.body = { message: err.message }
    err.cause = e
    throw err
  }
  const body = await parseJsonSafe(response)
  if (!response.ok) {
    const err = new Error(response.statusText || 'Request failed')
    err.status = response.status
    err.body = body
    throw err
  }
  return body
}

export { API_BASE_URL }
