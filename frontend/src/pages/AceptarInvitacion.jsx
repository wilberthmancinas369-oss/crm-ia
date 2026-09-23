import { Link, useParams } from 'react-router-dom'
import PagePlaceholder from '../components/PagePlaceholder'

export default function AceptarInvitacion() {
  const { token } = useParams()

  return (
    <PagePlaceholder
      title="Aceptar invitación"
      hu="HU-3"
      description="Pantalla a la que llega el link del correo: valida el token, muestra empresa/grupo/rol y permite crear la cuenta."
    >
      <small>Token recibido: <code>{token}</code></small>
      <Link to="/app/contactos" className="btn">Aceptar (demo)</Link>
    </PagePlaceholder>
  )
}
