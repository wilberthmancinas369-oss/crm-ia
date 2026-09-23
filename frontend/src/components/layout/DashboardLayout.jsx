import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { logout } from '../../services/auth'
import '../../styles/layout.css'

// Layout para la app con sesión iniciada (HU-2, HU-4 y siguientes).
export default function DashboardLayout() {
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <header className="dashboard-header">
        {/* TODO: mostrar nombre, empresa y rol del usuario en sesión */}
        <span>Usuario</span>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </header>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  )
}
