import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Protege las rutas bajo /app: exige sesión y un perfil con empresa.
export default function ProtectedRoute() {
  const { session, errorPerfil, cargando, cerrarSesion, reintentarPerfil } = useAuth()
  const location = useLocation()

  if (cargando) {
    return <p className="p-6 text-gray-500">Cargando tu cuenta...</p>
  }

  if (!session) {
    // Guarda a dónde quería ir para regresarlo después del login
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (errorPerfil) {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-4">
        <p role="alert" className="p-3 rounded-md text-sm bg-red-100 text-red-800">{errorPerfil}</p>
        <div className="flex justify-center gap-3">
          <button type="button" className="btn" onClick={reintentarPerfil}>Reintentar</button>
          <button type="button" className="btn btn-secondary" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
