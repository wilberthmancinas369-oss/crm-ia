import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Envuelve rutas que exigen un permiso (ver backend/src/config/permisos.js).
// El backend vuelve a validar cada petición; esto solo evita mostrar pantallas inútiles.
export default function RequierePermiso({ permiso }) {
  const { puede } = useAuth()

  if (!puede(permiso)) {
    return (
      <div className="card max-w-md mx-auto mt-10 text-center space-y-3">
        <h1 className="text-2xl">Sin permiso</h1>
        <p>Tu rol no tiene acceso a esta sección.</p>
        <Link to="/app" className="btn">Ir al inicio</Link>
      </div>
    )
  }

  return <Outlet />
}