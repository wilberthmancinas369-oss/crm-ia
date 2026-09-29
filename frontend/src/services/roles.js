import { api } from './api'

// Roles que se pueden asignar al invitar (Agente y Jefe de Área)
export async function listarRolesInvitables() {
  const { data } = await api.get('/roles/invitables')
  return data
}
