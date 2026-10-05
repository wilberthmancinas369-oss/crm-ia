import { api } from './api'

export async function enviarInvitacion({ email, grupoId, rolId }) {
  const { data } = await api.post(`/grupos/${grupoId}/invitar`, { email, role_id: rolId })
  return data
}

// Datos de la invitación (correo, empresa, grupo, rol). Pública: el invitado aún no tiene cuenta.
export async function validarInvitacion(token) {
  const { data } = await api.get(`/invitaciones/${token}`)
  return data
}

// Crea la cuenta del invitado y lo asocia a su grupo y rol. Después hay que iniciar sesión.
export async function aceptarInvitacion(token, { nombre, password }) {
  const { data } = await api.post(`/invitaciones/${token}/aceptar`, { nombre, password })
  return data
}
