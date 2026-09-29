import { api } from './api';

export async function enviarInvitacion({ email, groupId, rol }) {
  const { data } = await api.post('/invitaciones/enviar', { email, groupId, rol });
  return data;
}

export async function validarInvitacion(token) {
  const { data } = await api.get(`/invitaciones/validar/${token}`);
  return data;
}

export async function aceptarInvitacion(token, datosCuenta) {
  const { data } = await api.post(`/invitaciones/aceptar/${token}`, datosCuenta);
  return data;
}
