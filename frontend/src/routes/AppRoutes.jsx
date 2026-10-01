import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout'
import DashboardLayout from '../components/layout/DashboardLayout'
import ProtectedRoute from './ProtectedRoute'
import RequierePermiso from './RequierePermiso'

import Landing from '../pages/Landing'
import Login from '../pages/Login'
import RegistroEmpresa from '../pages/RegistroEmpresa'
import AceptarInvitacion from '../pages/AceptarInvitacion'
import Contactos from '../pages/Contactos'
import Oportunidades from '../pages/Oportunidades'
import Grupos from '../pages/Grupos'
import InvitarUsuario from '../pages/InvitarUsuario'
import Bienvenida from '../pages/Bienvenida'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<RegistroEmpresa />} />
        <Route path="/invitacion/:token" element={<AceptarInvitacion />} />
      </Route>

      {/* Autenticadas */}
      <Route path="/app" element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="contactos" replace />} />
          <Route path="bienvenida" element={<Bienvenida />} />
          <Route element={<RequierePermiso permiso="gestionarCRM" />}>
            <Route path="contactos" element={<Contactos />} />
            <Route path="oportunidades" element={<Oportunidades />} />
          </Route>
          <Route element={<RequierePermiso permiso="crearGrupos" />}>
            <Route path="grupos" element={<Grupos />} />
          </Route>
          <Route element={<RequierePermiso permiso="invitarUsuarios" />}>
            <Route path="grupos/invitar" element={<InvitarUsuario />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
