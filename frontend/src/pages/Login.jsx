import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { login } from '../services/auth.js'
import { useAuth } from '../context/AuthContext'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mismas clases de input que en RegistroEmpresa
const claseInput = (conError) =>
  `w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
    conError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
  }`

// Traduce un error de Supabase Auth a un mensaje para el usuario
function traducirErrorLogin(error) {
  switch (error?.code) {
    case 'invalid_credentials':
    case 'user_not_found':
      // No se distingue cuál de los dos falló para no revelar qué correos tienen cuenta
      return 'Correo o contraseña incorrectos.'
    case 'email_not_confirmed':
      return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.'
    case 'user_banned':
      return 'Esta cuenta está suspendida. Contacta al administrador de tu empresa.'
    case 'over_request_rate_limit':
      return 'Demasiados intentos en poco tiempo. Espera unos minutos y vuelve a intentarlo.'
  }

  if (error?.name === 'AuthRetryableFetchError' || error?.status === 0) {
    return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
  }

  return 'Ocurrió un error inesperado al iniciar sesión. Inténtalo de nuevo.'
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  // ProtectedRoute guarda la página que el usuario intentaba abrir
  const destino = location.state?.from?.pathname || '/app'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm({ mode: 'onTouched', defaultValues: { email: '', password: '' } })

  // Con sesión iniciada no tiene sentido mostrar el login
  if (session) {
    return <Navigate to={destino} replace />
  }

  const onSubmit = async ({ email, password }) => {
    try {
      await login(email, password)
      navigate(destino, { replace: true })
    } catch (error) {
      console.error('Error al iniciar sesión:', error)
      setError('root.servidor', { type: 'servidor', message: traducirErrorLogin(error) })
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold mb-1">Iniciar sesión</h1>
      <p className="text-sm text-gray-500 mb-6">Entra con la cuenta de tu empresa.</p>

      {errors.root?.servidor && (
        <div role="alert" className="mb-4 p-3 rounded-md text-sm bg-red-100 text-red-800">
          {errors.root.servidor.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-gray-600 mb-1">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@empresa.com"
            className={claseInput(errors.email)}
            {...register('email', {
              required: 'El correo es obligatorio',
              pattern: { value: EMAIL_REGEX, message: 'Ingresa un correo válido' }
            })}
          />
          <ErrorMessage>{errors.email?.message}</ErrorMessage>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-600 mb-1">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={claseInput(errors.password)}
            {...register('password', { required: 'La contraseña es obligatoria' })}
          />
          <ErrorMessage>{errors.password?.message}</ErrorMessage>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn w-full disabled:opacity-60">
          {isSubmitting ? 'Entrando...' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="text-sm text-center mt-4">
        <Link to="/registro">¿No tienes cuenta? Registra tu empresa</Link>
      </p>
    </section>
  )
}
