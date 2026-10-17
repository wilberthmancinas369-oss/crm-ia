import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// `permiso` debe coincidir con backend/src/config/permisos.js (docs/HU11-matriz-permisos.md).
// Ocultar una opción es solo comodidad: el backend valida cada petición.
export const NAV_ITEMS = [
  { to: '/app/contactos', label: 'Contactos', permiso: 'gestionarCRM' },
  { to: '/app/oportunidades', label: 'Oportunidades', permiso: 'gestionarCRM' },
  { to: '/app/tareas', label: 'Mis tareas', permiso: 'gestionarCRM' },
  { to: '/app/grupos', label: 'Grupos', permiso: 'verMiembros' },
  { to: '/app/grupos/invitar', label: 'Invitar usuario', permiso: 'invitarUsuarios' },
]

export default function Sidebar() {
  const { puede } = useAuth()

  return (
    <aside className="sidebar">
      <Link to="/app" className="sidebar-brand">CRM con IA</Link>
      <nav>
        {NAV_ITEMS.filter((item) => puede(item.permiso)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
