import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Iconos de trazo (24x24), sin dependencias externas
const ICONOS = {
  contactos: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  oportunidades: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  pipeline: (
    <>
      <path d="M6 5v11" />
      <path d="M12 5v6" />
      <path d="M18 5v14" />
    </>
  ),
  tareas: (
    <>
      <path d="m9 11 3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  equipo: (
    <>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </>
  ),
  grupos: (
    <>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </>
  ),
  usuarios: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  invitar: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </>
  ),
  reporteGrupo: (
    <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </>
  ),
  reporteGeneral: (
    <>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </>
  ),
}

function Icono({ nombre }) {
  return (
    <svg
      className="sidebar-icono"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONOS[nombre]}
    </svg>
  )
}

// `permiso` debe coincidir con backend/src/config/permisos.js (docs/HU11-matriz-permisos.md).
// Ocultar una opción es solo comodidad: el backend valida cada petición.
export const NAV_ITEMS = [
  { to: '/app/contactos', label: 'Contactos', permiso: 'gestionarCRM', seccion: 'ventas', icono: 'contactos' },
  { to: '/app/oportunidades', label: 'Oportunidades', permiso: 'gestionarCRM', seccion: 'ventas', icono: 'oportunidades' },
  { to: '/app/pipeline', label: 'Pipeline', permiso: 'gestionarCRM', seccion: 'ventas', icono: 'pipeline' },
  { to: '/app/tareas', label: 'Mis tareas', permiso: 'gestionarCRM', seccion: 'ventas', icono: 'tareas' },
  { to: '/app/tareas/equipo', label: 'Tareas del equipo', permiso: 'asignarResponsable', seccion: 'equipo', icono: 'equipo' },
  { to: '/app/grupos', label: 'Grupos', permiso: 'verMiembros', seccion: 'equipo', icono: 'grupos' },
  { to: '/app/usuarios', label: 'Usuarios', permiso: 'gestionarMiembros', seccion: 'equipo', icono: 'usuarios' },
  { to: '/app/grupos/invitar', label: 'Invitar usuario', permiso: 'invitarUsuarios', seccion: 'equipo', icono: 'invitar' },
  { to: '/app/reportes', label: 'Reporte de grupo', permiso: 'verReporteGrupo', seccion: 'reportes', icono: 'reporteGrupo' },
  { to: '/app/reportes/general', label: 'Reporte general', permiso: 'verReporteGeneral', seccion: 'reportes', icono: 'reporteGeneral' },
]

const SECCIONES = [
  { id: 'ventas', titulo: 'Ventas' },
  { id: 'equipo', titulo: 'Equipo' },
  { id: 'reportes', titulo: 'Reportes' },
]

export default function Sidebar({ abierto = false, onCerrar }) {
  const { puede } = useAuth()

  // Solo las secciones que tengan al menos una opción permitida para el rol
  const secciones = SECCIONES.map((seccion) => ({
    ...seccion,
    items: NAV_ITEMS.filter((item) => item.seccion === seccion.id && puede(item.permiso)),
  })).filter((seccion) => seccion.items.length > 0)

  return (
    <aside id="menu-lateral" className={`sidebar${abierto ? ' abierto' : ''}`}>
      <Link to="/app" className="sidebar-brand" onClick={onCerrar}>
        CRM con <span className="marca-ia">IA</span>
      </Link>
      <nav aria-label="Menú principal">
        {secciones.map((seccion) => (
          <div key={seccion.id} className="sidebar-seccion">
            <p className="sidebar-titulo">{seccion.titulo}</p>
            {seccion.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                onClick={onCerrar}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <Icono nombre={item.icono} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}