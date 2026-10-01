import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { CRMProvider } from '../../context/CRMContext'
import '../../styles/layout.css'

// Layout para la app con sesión iniciada (HU-2, HU-4 y siguientes).
export default function DashboardLayout() {
  const navigate = useNavigate()
  const { perfil, cerrarSesion } = useAuth()

  async function handleLogout() {
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <header className="dashboard-header">
        <div className="text-right leading-tight">
          <div className="text-sm font-medium text-gray-800">{perfil.usuario.nombre || perfil.usuario.email}</div>
          <div className="text-xs text-gray-500">
            {perfil.empresa.nombre} · {perfil.rol?.nombre ?? 'Sin rol'}
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </header>
      <main className="dashboard-main">
        {/* key: al cambiar de cuenta se descartan los contactos de la anterior */}
        <CRMProvider key={perfil.usuario.id}>
          <Outlet />
        </CRMProvider>
      </main>
    </div>
  )
}
