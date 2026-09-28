// Autenticación con Supabase Auth.
import { supabase } from './supabase'

export async function login(email, password) {
  // TODO: implementar login
}

export async function logout() {
  // TODO: implementar logout
}

export async function getSession() {
  // TODO: implementar lectura de sesión (usada por ProtectedRoute)
  return null
}

// Crea al administrador en Supabase Auth. La empresa, su perfil, roles y grupo inicial
// los crea el trigger de backend/db/migrations/hu1_registro_empresa.sql a partir de la metadata.
export async function registrarEmpresa({ nombreEmpresa, nombreAdmin, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        nombre_empresa: nombreEmpresa.trim(),
        nombre_admin: nombreAdmin.trim()
      }
    }
  })

  if (error) throw error
  return data // { user, session }
}
