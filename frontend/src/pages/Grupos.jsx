import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FormularioGrupo from '../components/FormularioGrupo'
import { listarGruposConMiembros } from '../services/grupos'
import { useAuth } from '../context/AuthContext'

const formatoFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

// Colores por nivel de rol: Agente (0), Jefe de Área (1), Administrador (2)
const claseRol = (nivel) =>
  nivel >= 2 ? 'bg-purple-100 text-purple-700' : nivel === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'

function TarjetaGrupo({ grupo }) {
  return (
    <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-800">{grupo.nombre}</h2>
          <span className="text-xs text-gray-500">
            {grupo.miembros.length} {grupo.miembros.length === 1 ? 'miembro' : 'miembros'}
          </span>
        </div>
        {grupo.descripcion && <p className="text-sm text-gray-500">{grupo.descripcion}</p>}
      </div>

      {grupo.miembros.length === 0 ? (
        <p className="text-sm text-gray-500">Aún no hay miembros en este grupo.</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-gray-500 border-b">
            <tr>
              <th className="py-2 pr-2">Nombre</th>
              <th className="py-2 pr-2">Correo</th>
              <th className="py-2">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grupo.miembros.map((m) => (
              <tr key={m.id}>
                <td className="py-2 pr-2 font-medium text-gray-800">{m.nombre || '—'}</td>
                <td className="py-2 pr-2 text-gray-600">{m.email}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${claseRol(m.nivel)}`}>{m.rol}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {grupo.invitacionesPendientes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Invitaciones pendientes</h3>
          <ul className="text-sm divide-y divide-gray-100">
            {grupo.invitacionesPendientes.map((i) => (
              <li key={i.id} className="py-1.5 flex flex-wrap justify-between gap-2 text-gray-600">
                <span>{i.email} · {i.rol}</span>
                <span className="text-xs text-gray-400">vence {formatoFecha(i.expira)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default function Grupos() {
  const { puede } = useAuth()
  const [grupos, setGrupos] = useState(null) // null = cargando
  const [error, setError] = useState(null)

  const cargarGrupos = useCallback(async () => {
    try {
      setError(null)
      setGrupos(await listarGruposConMiembros())
    } catch (err) {
      console.error('Error al cargar grupos:', err)
      setError(err.response?.data?.error || 'No se pudieron cargar los grupos.')
      setGrupos([])
    }
  }, [])

  useEffect(() => {
    cargarGrupos()
  }, [cargarGrupos])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Grupos</h1>
        {puede('invitarUsuarios') && (
          <Link to="/app/grupos/invitar" className="btn">Invitar usuario</Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <FormularioGrupo onCreado={cargarGrupos} />

        <div className="lg:col-span-2 space-y-4">
          {error && (
            <p role="alert" className="p-3 rounded-md text-sm bg-red-100 text-red-800">{error}</p>
          )}
          {grupos === null ? (
            <p className="text-gray-500">Cargando grupos...</p>
          ) : grupos.length === 0 && !error ? (
            <p className="text-gray-500">Todavía no hay grupos. Crea el primero con el formulario.</p>
          ) : (
            grupos.map((grupo) => <TarjetaGrupo key={grupo.id} grupo={grupo} />)
          )}
        </div>
      </div>
    </div>
  )
}
