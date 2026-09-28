import { api } from './api'

export async function enviarInvitacion({ email, grupoId, rolId }) {
  const { data } = await api.post(`/grupos/${grupoId}/invitar`, { email, role_id: rolId })
  return data
}

export async function validarInvitacion(token) {
  // TODO: implementar en HU-3 (falta endpoint en el backend)
}

export async function aceptarInvitacion(token) {
  const { data } = await api.post('/invitaciones/aceptar', { token })
  return data
}
