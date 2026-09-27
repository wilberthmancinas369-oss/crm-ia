import { api } from './api';

export async function listarInteracciones({ contactoId, oportunidadId } = {}) {
  if (contactoId) {
    const { data } = await api.get(`/interacciones/contacto/${contactoId}`);
    return data;
  }
  const { data } = await api.get('/interacciones');
  return data;
}

export async function registrarInteraccion(datos) {
  // datos = { contacto_id, tipo, detalle, oportunidad_id? }
  const { data } = await api.post('/interacciones', datos);
  return data;
}

export async function eliminarInteraccion(id) {
  const { data } = await api.delete(`/interacciones/${id}`);
  return data;
}