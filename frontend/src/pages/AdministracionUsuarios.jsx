import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { listarGruposConMiembros } from '../services/grupos'
import { listarRolesInvitables } from '../services/roles'
import { cambiarRolUsuario, moverUsuarioDeGrupo, removerUsuarioDeGrupo, eliminarUsuarioDeEmpresa } from '../services/usuarios'

export default function AdministracionUsuarios() {
  const { perfil, puede, user } = useAuth()
  const [usuarios, setUsuarios] = useState(null) // null = cargando
  const [roles, setRoles] = useState([])
  const [grupos, setGrupos] = useState([])
  const [error, setError] = useState(null)
  const [cargandoAccion, setCargandoAccion] = useState(null) // ID de usuario siendo procesado

  const cargarDatos = useCallback(async () => {
    try {
      setError(null)
      // Obtenemos los grupos y sus miembros para armar la lista de usuarios
      const datosGrupos = await listarGruposConMiembros()
      const listaUsuarios = []
      const listaGrupos = []

      datosGrupos.forEach(g => {
        listaGrupos.push({ id: g.id, nombre: g.nombre })
        g.miembros.forEach(m => {
          listaUsuarios.push({
            id: m.id,
            nombre: m.nombre,
            email: m.email,
            rol: m.rol,
            nivel: m.nivel,
            grupoId: g.id,
            grupoNombre: g.nombre
          })
        })
      })

      setUsuarios(listaUsuarios)
      setGrupos(listaGrupos)
      setRoles(await listarRolesInvitables())
    } catch (err) {
      console.error('Error al cargar usuarios:', err)
      setError(err.response?.data?.error || 'No se pudieron cargar los usuarios.')
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const manejarCambiarRol = async (userId, groupId, roleId) => {
    if (!roleId) return
    setCargandoAccion(userId)
    try {
      await cambiarRolUsuario(userId, groupId, roleId)
      alert('Rol actualizado con éxito')
      await cargarDatos()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar el rol')
    } finally {
      setCargandoAccion(null)
    }
  }

  const manejarMoverGrupo = async (userId, oldGroupId, newGroupId) => {
    if (oldGroupId === newGroupId) return
    setCargandoAccion(userId)
    try {
      await moverUsuarioDeGrupo(userId, oldGroupId, newGroupId)
      alert('Usuario movido de grupo con éxito')
      await cargarDatos()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al mover el usuario')
    } finally {
      setCargandoAccion(null)
    }
  }

  const manejarRemoverGrupo = async (userId, groupId) => {
    if (!window.confirm('¿Estás seguro de que deseas remover a este usuario del grupo?')) return
    setCargandoAccion(userId)
    try {
      await removerUsuarioDeGrupo(userId, groupId)
      alert('Usuario removido del grupo con éxito')
      await cargarDatos()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al remover el usuario')
    } finally {
      setCargandoAccion(null)
    }
  }

  const manejarEliminarDeEmpresa = async (userId) => {
    if (!window.confirm('ADVERTENCIA: Esta acción eliminará permanentemente al usuario de la empresa y de la base de datos. Esta acción es irreversible. ¿Estás seguro?')) return
    setCargandoAccion(userId)
    try {
      await eliminarUsuarioDeEmpresa(userId)
      alert('Usuario eliminado definitivamente de la empresa')
      await cargarDatos()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar el usuario de la empresa')
    } finally {
      setCargandoAccion(null)
    }
  }

  if (!perfil) return <p className="p-6 text-gray-500">Cargando...</p>

  // El Agente no debe ver esta pantalla (según requerimiento)
  if (perfil.rol.nivel < 1) {
    return <div className="p-6 text-center"><p className="text-red-500">No tienes permisos para acceder a esta pantalla.</p></div>
  }

  // --- Alcance según el rol del usuario logueado ---
  const miNivel = perfil.rol.nivel
  const esAdmin = miNivel === 2
  const listaUsuarios = usuarios ?? []

  // Identificar el ID del usuario logueado correctamente desde el objeto perfil
  const miId = perfil.usuario?.id
  const miEmail = perfil.usuario?.email?.toLowerCase()
  
  const esYo = (u) =>
    u.id === miId || 
    (!!u.email && u.email.toLowerCase() === miEmail)

  // Grupos que gestiona el Jefe de Área (aquellos en los que él es miembro).
  const misGruposIds = new Set(
    esAdmin ? [] : listaUsuarios.filter(esYo).map(u => u.grupoId)
  )

  // TEMPORAL (diagnóstico): si el Jefe de Área no se encuentra en la lista, avisa en consola. Borrar al confirmar que funciona.
  if (!esAdmin && usuarios !== null && misGruposIds.size === 0) {
    console.warn('No se encontró al usuario logueado entre los miembros', { perfil, user, primerMiembro: listaUsuarios[0] })
  }
  const gestionaGrupo = (grupoId) => esAdmin || misGruposIds.has(grupoId)

  // FILTRO REAL (se aplica a las filas que se renderizan):
  // - Administrador: ve todos los usuarios de la empresa.
  // - Jefe de Área: solo ve las filas de los grupos que gestiona, es decir,
  //   únicamente usuarios que comparten al menos uno de sus grupos.
  const usuariosVisibles = esAdmin
    ? listaUsuarios
    : listaUsuarios.filter(u => misGruposIds.has(u.grupoId))

  // Roles asignables: el Jefe de Área solo hasta su propio nivel
  const nivelDeRol = (r) => r.level ?? r.nivel
  const rolesAsignables = esAdmin
    ? roles
    : roles.filter(r => nivelDeRol(r) === undefined || nivelDeRol(r) <= miNivel)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Administración de Usuarios</h1>
        <p className="text-sm text-gray-500">Gestiona los roles y la asignación de grupos de los miembros de la empresa.</p>
      </div>

      {error && (
        <p role="alert" className="p-3 rounded-md text-sm bg-red-100 text-red-800">{error}</p>
      )}

      {usuarios === null ? (
        <p className="text-gray-500">Cargando usuarios...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-gray-500 bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Grupo Actual</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuariosVisibles.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">No hay usuarios registrados en grupos.</td>
                </tr>
              ) : (
                usuariosVisibles.map((u) => {
                  // Solo se puede actuar sobre filas de grupos que el usuario logueado gestiona
                  const puedeGestionarFila = gestionaGrupo(u.grupoId)
                  // Grupos destino: el Jefe de Área solo puede elegir grupos que gestiona
                  const gruposDestino = esAdmin
                    ? grupos
                    : grupos.filter(g => misGruposIds.has(g.id) || g.id === u.grupoId)
                  // Mantener visible el rol actual aunque no sea asignable por el Jefe de Área
                  const rolActualEnLista = rolesAsignables.some(r => r.name === u.rol)

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{u.nombre || 'Sin nombre'}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="bg-transparent border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          value={u.grupoId}
                          onChange={(e) => manejarMoverGrupo(u.id, u.grupoId, e.target.value)}
                          disabled={cargandoAccion === u.id || !puedeGestionarFila}
                        >
                          {gruposDestino.map(g => (
                            <option key={g.id} value={g.id}>{g.nombre}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="bg-transparent border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          value={u.rol}
                          onChange={(e) => {
                            const rolObj = rolesAsignables.find(r => r.name === e.target.value)
                            if (rolObj) manejarCambiarRol(u.id, u.grupoId, rolObj.id)
                          }}
                          disabled={cargandoAccion === u.id || !puedeGestionarFila}
                        >
                          {!rolActualEnLista && (
                            <option value={u.rol} disabled>{u.rol}</option>
                          )}
                          {rolesAsignables.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button 
                          onClick={() => manejarRemoverGrupo(u.id, u.grupoId)}
                          disabled={cargandoAccion === u.id || !puedeGestionarFila}
                          className="text-xs text-red-600 hover:text-red-800 font-medium disabled:text-gray-400"
                        >
                          Remover
                        </button>
                        {/* Solo el Administrador (nivel 2) puede eliminar usuarios de la empresa */}
                        {esAdmin && u.id !== perfil.id && (
                          <button
                            onClick={() => manejarEliminarDeEmpresa(u.id)}
                            disabled={cargandoAccion === u.id}
                            className="inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-900 font-bold disabled:text-gray-400"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Eliminar Empresa
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
