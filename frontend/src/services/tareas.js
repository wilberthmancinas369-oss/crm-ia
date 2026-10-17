import { api } from './api';

export async function listarMisTareas() {
  const { data } = await api.get('/tareas');
  return data;
}

export async function crearTarea(datos) {
  const { data } = await api.post('/tareas', datos);
  return data;
}
