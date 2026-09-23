import { Link, Outlet } from 'react-router-dom'
import '../../styles/layout.css'

// Layout para pantallas públicas: landing, login, registro y aceptar invitación.
export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <header className="auth-header">
        <Link to="/">CRM con IA</Link>
      </header>
      <main className="auth-main">
        <div className="auth-card">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
