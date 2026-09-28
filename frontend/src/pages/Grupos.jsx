import { Link } from 'react-router-dom'
import FormularioGrupo from '../components/FormularioGrupo'

export default function Grupos() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Grupos</h1>
        <Link to="/app/grupos/invitar" className="btn">Invitar usuario</Link>
      </div>

      <FormularioGrupo />
    </div>
  )
}
