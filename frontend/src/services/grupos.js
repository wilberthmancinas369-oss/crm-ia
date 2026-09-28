import { api } from './api'

export async function listarGrupos() {
  // TODO: implementar en HU-2 (falta endpoint GET /api/grupos en el backend)
}

export async function crearGrupo(datos) {
  const { data } = await api.post('/grupos', datos)
  return data
}
