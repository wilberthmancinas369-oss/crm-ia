import { Link } from 'react-router-dom'
import PagePlaceholder from '../components/PagePlaceholder'

export default function Grupos() {
  return (
    <PagePlaceholder
      title="Grupos"
      hu="HU-2"
      description="Listado de grupos/departamentos de la empresa y opción para crear uno nuevo."
    >
      <Link to="/app/grupos/invitar" className="btn">Invitar usuario</Link>
    </PagePlaceholder>
  )
}
