import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { CRMProvider } from '../../context/CRMContext'
import '../../styles/layout.css'
import '../../styles/components.css'

const iniciales = (texto) =>
  texto.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase()

// Layout para la app con sesión iniciada (HU-2, HU-4 y siguientes).
export default function DashboardLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { perfil, cerrarSesion } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false) // solo aplica en pantallas chicas

  // El menú móvil se cierra al cambiar de pantalla y con Escape
  useEffect(() => {
    setMenuAbierto(false)
  }, [pathname])

  useEffect(() => {
    if (!menuAbierto) return
    const alPulsar = (e) => e.key === 'Escape' && setMenuAbierto(false)
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [menuAbierto])

  async function handleLogout() {
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  const nombre = perfil.usuario.nombre || perfil.usuario.email

  return (
    <div className="dashboard-layout">
      <a href="#contenido" className="saltar">Saltar al contenido</a>
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      {menuAbierto && <div className="sidebar-fondo" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}

      <header className="dashboard-header">
        <div className="header-contexto">
          <button
            type="button"
            className="header-menu"
            aria-label="Abrir menú"
            aria-controls="menu-lateral"
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <span className="header-empresa">{perfil.empresa.nombre}</span>
        </div>

        <div className="header-usuario">
          <span className="header-avatar" aria-hidden="true">{iniciales(nombre)}</span>
          <div className="header-datos">
            <span className="header-nombre">{nombre}</span>
            <span className="header-rol">{perfil.rol?.nombre ?? 'Sin rol'}</span>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="dashboard-main">
        {/* key: al cambiar de cuenta se descartan los contactos de la anterior */}
        <CRMProvider key={perfil.usuario.id}>
          <div key={pathname} className="entrada-crm"><Outlet /></div>
        </CRMProvider>
      </main>
    </div>
  )
}
