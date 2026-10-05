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
