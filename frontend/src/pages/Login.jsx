import { Link } from 'react-router-dom'
import PagePlaceholder from '../components/PagePlaceholder'

export default function Login() {
  return (
    <PagePlaceholder
      title="Iniciar sesión"
      hu="Login"
      description="Formulario de correo y contraseña con Supabase Auth."
    >
      {/* Acceso temporal para navegar la app mientras no hay autenticación */}
      <Link to="/app" className="btn">Entrar (demo)</Link>
      <Link to="/registro">¿No tienes cuenta? Registra tu empresa</Link>
    </PagePlaceholder>
  )
}
