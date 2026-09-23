import { Outlet } from 'react-router-dom'

// Protege las rutas bajo /app.
// TODO: validar la sesión con services/auth.js y redirigir a /login si no hay sesión.
export default function ProtectedRoute() {
  return <Outlet />
}
