import { Link } from 'react-router-dom'
import FormularioGrupo from '../components/FormularioGrupo'
import { useAuth } from '../context/AuthContext'

export default function Grupos() {
  const { puede } = useAuth()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Grupos</h1>
        {puede('invitarUsuarios') && (
          <Link to="/app/grupos/invitar" className="btn">Invitar usuario</Link>
        )}
      </div>

      <FormularioGrupo />
    </div>
  )
}
