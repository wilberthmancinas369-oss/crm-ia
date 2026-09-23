import { Link } from 'react-router-dom'
import PagePlaceholder from '../components/PagePlaceholder'

export default function InvitarUsuario() {
  return (
    <PagePlaceholder
      title="Invitar usuario"
      hu="HU-2"
      description="Formulario de invitación: correo, grupo y rol (Agente o Jefe de Área). Envía un correo con el link de invitación."
    >
      <Link to="/app/grupos">Volver a Grupos</Link>
    </PagePlaceholder>
  )
}
