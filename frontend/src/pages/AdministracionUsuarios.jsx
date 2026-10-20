import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { listarGruposConMiembros } from '../services/grupos'
import { listarRolesInvitables } from '../services/roles'
import { cambiarRolUsuario, moverUsuarioDeGrupo, eliminarUsuarioDeEmpresa } from '../services/usuarios'
import { tienePermisoEnGrupo } from '../hooks/useGruposPermitidos'

// HU-9. El backend decide qué se permite (config/permisos.js); aquí solo se desactivan las acciones
// que de seguro rechazaría, para no ofrecerlas.
const NIVEL_JEFE = 1

export default function AdministracionUsuarios() {
  const { perfil, puede } = useAuth()
  const [usuarios, setUsuarios] = useState(null) // null = cargando
  const [roles, setRoles] = useState([])
  const [grupos, setGrupos] = useState([])
  const [error, setError] = useState(null)
  const [cargandoAccion, setCargandoAccion] = useState(null) // fila (usuario + grupo) en proceso

  const cargarDatos = useCallback(async () => {
    try {
      setError(null)
      // El backend ya filtra: el Jefe de Área solo recibe los grupos que dirige
      const [datosGrupos, rolesAsignables] = await Promise.all([listarGruposConMiembros(), listarRolesInvitables()])
      setGrupos(datosGrupos.map((g) => ({ id: g.id, nombre: g.nombre })))
      setUsuarios(datosGrupos.flatMap((g) => g.miembros.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        email: m.email,
        rol: m.rol,
        nivel: m.nivel,
        grupoId: g.id,
        grupoNombre: g.nombre
      }))))
      setRoles(rolesAsignables)
    } catch (err) {
      console.error('Error al cargar usuarios:', err)
      setError(err.response?.data?.error || 'No se pudieron cargar los usuarios.')
      setUsuarios([])
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Ejecuta una acción sobre una fila, avisa el resultado y recarga la tabla
  const ejecutar = async (fila, accion, exito, fallo) => {
    setCargandoAccion(fila)
    try {
      await accion()
      alert(exito)
      await cargarDatos()
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || fallo)
    } finally {
      setCargandoAccion(null)
    }
  }

  const esAdmin = perfil.alcances?.gestionarMiembros === null
  // Solo el Administrador elimina usuarios de la empresa; sin esa acción no hay columna de acciones
  const puedeEliminar = puede('administrarUsuarios')
  const gestionaGrupo = (grupoId) => tienePermisoEnGrupo(perfil, 'gestionarMiembros', grupoId)
  const listaUsuarios = usuarios ?? []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Administración de Usuarios</h1>
        <p className="text-sm text-gray-500">
          {esAdmin
            ? 'Gestiona los roles y la asignación de grupos de los miembros de la empresa.'
            : 'Gestiona a los Agentes de los grupos que diriges.'}
        </p>
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
                <th className="px-4 py-3">Grupo</th>
                <th className="px-4 py-3">Rol</th>
                {puedeEliminar && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listaUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={puedeEliminar ? 4 : 3} className="px-4 py-8 text-center text-gray-500">No hay usuarios registrados en grupos.</td>
                </tr>
              ) : (
                listaUsuarios.map((u) => {
                  const fila = `${u.id}:${u.grupoId}`
                  const esYo = u.id === perfil.usuario.id
                  // Jefe de Área: solo Agentes de su grupo. Nadie se gestiona a sí mismo.
                  const puedeGestionarFila = !esYo && gestionaGrupo(u.grupoId) && (esAdmin || u.nivel < NIVEL_JEFE)
                  const ocupado = cargandoAccion === fila
                  const gruposDestino = grupos.filter((g) => g.id === u.grupoId || gestionaGrupo(g.id))
                  // El rol actual se muestra aunque no sea asignable (p. ej. Administrador)
                  const rolActualEnLista = roles.some((r) => r.name === u.rol)

                  return (
                    <tr key={fila} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{u.nombre || 'Sin nombre'}{esYo && ' (tú)'}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Grupo de ${u.nombre || u.email}`}
                          className="bg-transparent border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          value={u.grupoId}
                          onChange={(e) => e.target.value !== u.grupoId && ejecutar(fila,
                            () => moverUsuarioDeGrupo(u.id, u.grupoId, e.target.value),
                            'Usuario movido de grupo con éxito', 'Error al mover el usuario')}
                          disabled={ocupado || !puedeGestionarFila}
                        >
                          {gruposDestino.map((g) => (
                            <option key={g.id} value={g.id}>{g.nombre}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Rol de ${u.nombre || u.email}`}
                          className="bg-transparent border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          value={u.rol}
                          onChange={(e) => {
                            const rol = roles.find((r) => r.name === e.target.value)
                            if (rol) ejecutar(fila, () => cambiarRolUsuario(u.id, u.grupoId, rol.id),
                              'Rol actualizado con éxito', 'Error al cambiar el rol')
                          }}
                          disabled={ocupado || !puedeGestionarFila}
                        >
                          {!rolActualEnLista && <option value={u.rol} disabled>{u.rol}</option>}
                          {roles.map((r) => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      </td>
                      {puedeEliminar && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {!esYo && (
                            <button
                              onClick={() => window.confirm('ADVERTENCIA: se eliminará permanentemente al usuario de la empresa. Sus tareas pasarán a ti y sus oportunidades quedarán sin responsable. Esta acción es irreversible. ¿Continuar?') &&
                                ejecutar(fila, () => eliminarUsuarioDeEmpresa(u.id),
                                  'Usuario eliminado definitivamente de la empresa', 'Error al eliminar el usuario de la empresa')}
                              disabled={ocupado}
                              className="text-xs text-red-700 hover:text-red-900 font-bold disabled:text-gray-400"
                            >
                              Eliminar de la empresa
                            </button>
                          )}
                        </td>
                      )}
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
