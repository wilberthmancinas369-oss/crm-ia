import { api } from './api';

export async function listarContactos() {
  const { data } = await api.get('/contactos');
  return data;
}

export async function obtenerContactoPorId(id) {
  const { data } = await api.get(`/contactos/${id}`);
  return data;
}

export async function crearContacto(datos) {
  const { data } = await api.post('/contactos', datos);
  return data;
}

export async function actualizarContacto(id, datos) {
  const { data } = await api.put(`/contactos/${id}`, datos);
  return data;
}

export async function eliminarContacto(id) {
  const { data } = await api.delete(`/contactos/${id}`);
  return data;
}