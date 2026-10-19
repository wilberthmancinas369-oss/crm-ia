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
  // datos: { nombre_oportunidad, contacto_id, valor_estimado, etapa, probabilidad, fecha_cierre_prevista, responsable_id? }
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

export async function reasignarOportunidad(id, responsable_id) {
  const { data } = await api.patch(`/oportunidades/${id}/reasignar`, { responsable_id });
  return data;
}

export async function obtenerHistorialReasignaciones(id) {
  const { data } = await api.get(`/oportunidades/${id}/reasignaciones`);
  return data;
}

// Colaboradores: otros usuarios del grupo que ayudan con la oportunidad (HU 4.1)
export async function listarColaboradores(id) {
  const { data } = await api.get(`/oportunidades/${id}/colaboradores`);
  return data;
}

export async function agregarColaborador(id, userId) {
  const { data } = await api.post(`/oportunidades/${id}/colaboradores`, { user_id: userId });
  return data;
}

export async function quitarColaborador(id, userId) {
  const { data } = await api.delete(`/oportunidades/${id}/colaboradores/${userId}`);
  return data;
}
