// Cliente HTTP hacia la API del CRM (backend Node.js + Express).
// Todos los servicios de datos pasan por aquí; el frontend no habla directo con la base de datos.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

// TODO: adjuntar el token de sesión (Authorization: Bearer ...) y manejar errores.
async function request(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Error ${res.status} en ${method} ${path}`)
  return res.status === 204 ? null : res.json()
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
}
