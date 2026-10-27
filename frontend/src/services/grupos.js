import { api } from './api'

export async function listarGrupos() {
  const { data } = await api.get('/grupos')
  return data
}

export async function crearGrupo(datos) {
  const { data } = await api.post('/grupos', datos)
  return data
}

// Grupos con sus miembros e invitaciones pendientes (pantalla Grupos)
export async function listarGruposConMiembros() {
  const { data } = await api.get('/grupos/miembros')
  return data
}

// Responsables y colaboradores posibles para oportunidades del grupo: sus miembros y los administradores
export async function listarAsignables(grupoId) {
  const { data } = await api.get(`/grupos/${grupoId}/asignables`)
  return data
}

export async function renombrarGrupo(grupoId, name) {
  const { data } = await api.patch(`/grupos/${grupoId}`, { name })
  return data
}

export async function eliminarGrupo(grupoId) {
  const { data } = await api.delete(`/grupos/${grupoId}`)
  return data
}