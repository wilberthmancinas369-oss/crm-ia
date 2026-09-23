import { Link, NavLink } from 'react-router-dom'

// `roles` indica quién debe ver cada opción según el Sprint 0
// (Agente < Jefe de Área < Administrador). Aún no se filtra.
// TODO: filtrar por el rol del usuario en sesión.
export const NAV_ITEMS = [
  { to: '/app/contactos', label: 'Contactos', roles: ['agente', 'jefe_area', 'admin'] },
  { to: '/app/oportunidades', label: 'Oportunidades', roles: ['agente', 'jefe_area', 'admin'] },
  { to: '/app/grupos', label: 'Grupos', roles: ['admin'] },
  { to: '/app/grupos/invitar', label: 'Invitar usuario', roles: ['jefe_area', 'admin'] },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <Link to="/app" className="sidebar-brand">CRM con IA</Link>
      <nav>
        {NAV_ITEMS.map((item) => (
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
