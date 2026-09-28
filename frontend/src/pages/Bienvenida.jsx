import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getSession } from '../services/auth'

// Pantalla a la que llega el administrador después de registrar su empresa (HU-1).
export default function Bienvenida() {
  const [session, setSession] = useState(undefined) // undefined = cargando, null = sin sesión

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => setSession(null))
  }, [])

  if (session === undefined) {
    return <p className="text-gray-500">Cargando...</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Los nombres vienen de la metadata que se envió en signUp (services/auth.js)
  const { nombre_admin: nombreAdmin, nombre_empresa: nombreEmpresa } = session.user.user_metadata

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">¡Bienvenido, {nombreAdmin}!</h1>
        <p className="text-gray-600 mt-1">
          Tu empresa <strong>{nombreEmpresa}</strong> quedó registrada y eres su administrador.
        </p>
      </div>

      <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">Primeros pasos</h2>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
          <li>Crea los grupos o departamentos de tu empresa.</li>
          <li>Invita a tu equipo y asígnales un rol.</li>
          <li>Empieza a registrar contactos y oportunidades.</li>
        </ol>
        <Link to="/app/grupos" className="btn inline-block">Crear mis grupos</Link>
      </section>
    </div>
  )
}
