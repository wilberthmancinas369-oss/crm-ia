import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Envuelve rutas que exigen un permiso (ver backend/src/config/permisos.js).
// El backend vuelve a validar cada petición; esto solo evita mostrar pantallas inútiles.
export default function RequierePermiso({ permiso }) {
  const { puede } = useAuth()

  if (!puede(permiso)) {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-3">
        <h1 className="text-xl font-bold text-gray-800">Sin permiso</h1>
        <p className="text-sm text-gray-600">Tu rol no tiene acceso a esta sección.</p>
        <Link to="/app" className="btn inline-block">Ir al inicio</Link>
      </div>
    )
  }

  return <Outlet />
}
