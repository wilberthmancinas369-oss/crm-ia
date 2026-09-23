import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <section>
      <h1>CRM con IA</h1>
      <p>Gestiona contactos, oportunidades y a tu equipo de ventas con apoyo de IA.</p>
      <div className="page-actions">
        <Link to="/registro" className="btn">Registrar mi empresa</Link>
        <Link to="/login" className="btn btn-secondary">Iniciar sesión</Link>
      </div>
    </section>
  )
}
