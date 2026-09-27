import { api } from './api';

export async function listarOportunidades() {
  const { data } = await api.get('/oportunidades');
  return data;
}

export async function obtenerOportunidadPorId(id) {
  const { data } = await api.get(`/oportunidades/${id}`);
  return data;
}

export async function crearOportunidad(datos) {
  // datos: { nombre_oportunidad, contacto_id, valor_estimado, etapa, probabilidad }
  const { data } = await api.post('/oportunidades', datos);
  return data;
}

export async function actualizarOportunidad(id, datos) {
  const { data } = await api.put(`/oportunidades/${id}`, datos);
  return data;
}

export async function eliminarOportunidad(id) {
  const { data } = await api.delete(`/oportunidades/${id}`);
  return data;
}