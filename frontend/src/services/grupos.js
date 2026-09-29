import { api } from './api'

export async function listarGrupos() {
  const { data } = await api.get('/grupos')
  return data
}

export async function crearGrupo(datos) {
  const { data } = await api.post('/grupos', datos)
  return data
}
