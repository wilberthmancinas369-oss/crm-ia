import { api } from './api'

// Roles que la cuenta puede asignar al invitar a un grupo.
// Administrador: Agente y Jefe de Área. Jefe de Área: solo Agente (HU-11).
export async function listarRolesInvitables(grupoId) {
  const { data } = await api.get('/roles/invitables', { params: grupoId ? { grupo_id: grupoId } : undefined })
  return data
}
