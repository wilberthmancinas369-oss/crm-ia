import { Link } from 'react-router-dom'
import PagePlaceholder from '../components/PagePlaceholder'

export default function RegistroEmpresa() {
  return (
    <PagePlaceholder
      title="Registrar empresa"
      hu="HU-1"
      description="Formulario con datos de la empresa y del administrador. Al terminar, el administrador entra a Grupos para crear sus departamentos."
    >
      <Link to="/app/grupos" className="btn">Continuar (demo)</Link>
      <Link to="/login">¿Ya tienes cuenta? Inicia sesión</Link>
    </PagePlaceholder>
  )
}
