import { api } from './api'

export async function cambiarRolUsuario(userId, groupId, roleId) {
  const { data } = await api.post('/usuarios/cambiar-rol', { userId, groupId, roleId })
  return data
}

export async function moverUsuarioDeGrupo(userId, oldGroupId, newGroupId) {
  const { data } = await api.post('/usuarios/mover-grupo', { userId, oldGroupId, newGroupId })
  return data
}

export async function eliminarUsuarioDeEmpresa(userId) {
  const { data } = await api.post('/usuarios/eliminar-empresa', { userId })
  return data
}
