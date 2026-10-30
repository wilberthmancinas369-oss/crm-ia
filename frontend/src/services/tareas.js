import { api } from './api';

export async function listarMisTareas(filtros = {}) {
  const { data } = await api.get('/tareas', { params: filtros });
  return data;
}

export async function crearTarea(datos) {
  const { data } = await api.post('/tareas', datos);
  return data;
}

export async function actualizarTarea(id, datos) {
  const { data } = await api.put(`/tareas/${id}`, datos);
  return data;
}

export async function completarTarea(id) {
  const { data } = await api.patch(`/tareas/${id}/completar`);
  return data;
}
