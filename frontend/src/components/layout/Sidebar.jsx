import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// `permiso` debe coincidir con backend/src/config/permisos.js
// (Agente < Jefe de Área < Administrador; cada rol hereda los del anterior).
export const NAV_ITEMS = [
  { to: '/app/contactos', label: 'Contactos', permiso: 'gestionarCRM' },
  { to: '/app/oportunidades', label: 'Oportunidades', permiso: 'gestionarCRM' },
  { to: '/app/grupos', label: 'Grupos', permiso: 'crearGrupos' },
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
