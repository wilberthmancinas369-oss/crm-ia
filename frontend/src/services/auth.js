// Autenticación con Supabase Auth.
import { supabase } from './supabase'
import { api } from './api'

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  return data // { user, session }
}

// Empresa, rol, grupos y permisos de la cuenta en sesión (GET /api/auth/me)
export async function obtenerPerfil() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Supabase guarda la sesión en localStorage, así que sobrevive a recargas de página
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
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
