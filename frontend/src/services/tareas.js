import { api } from './api';

export async function listarMisTareas() {
  const { data } = await api.get('/tareas');
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

// HU-13: tareas de los grupos donde la cuenta es Jefe de Área (o de toda la empresa si es Administrador)
export async function listarTareasEquipo() {
  const { data } = await api.get('/tareas/equipo');
  return data;
}

export async function asignarTarea(id, responsableId) {
  const { data } = await api.patch(`/tareas/${id}/asignar`, { responsable_id: responsableId });
  return data;
}

export async function eliminarTarea(id) {
  await api.delete(`/tareas/${id}`);
}
