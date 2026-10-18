import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listarGrupos } from '../services/grupos'

/**
 * Grupos donde la cuenta puede ejercer un permiso: [{ id, nombre }].
 * Sale de perfil.alcances (GET /api/auth/me), calculado en el backend con config/permisos.js.
 * alcance null = toda la empresa (Administrador): se piden todos los grupos al backend.
 */
export function useGruposPermitidos(permiso) {
  const { perfil } = useAuth()
  // Ojo: null significa "toda la empresa"; solo se usa [] si el permiso no viene en el perfil
  const alcances = perfil.alcances ?? {}
  const alcance = permiso in alcances ? alcances[permiso] : []
  const deEmpresa = alcance === null
  const [todos, setTodos] = useState([])

  useEffect(() => {
    if (!deEmpresa) return
    listarGrupos()
      .then((grupos) => setTodos(grupos.map((g) => ({ id: g.id, nombre: g.name }))))
      .catch((error) => console.error('Error al cargar grupos:', error))
  }, [deEmpresa])

  if (deEmpresa) return todos
  return perfil.grupos.filter((g) => alcance.includes(g.id)).map((g) => ({ id: g.id, nombre: g.nombre }))
}

// ¿La cuenta tiene el permiso en este grupo? Usa perfil.alcances (null = toda la empresa)
export function tienePermisoEnGrupo(perfil, permiso, grupoId) {
  const alcances = perfil?.alcances ?? {}
  if (!(permiso in alcances)) return false
  return alcances[permiso] === null || alcances[permiso].includes(grupoId)
}
