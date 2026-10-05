import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { validarInvitacion, aceptarInvitacion } from '../services/invitaciones.js'
import { login } from '../services/auth.js'
import { useAuth } from '../context/AuthContext'

// Mismas clases de input que en RegistroEmpresa
const claseInput = (conError) =>
  `w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
    conError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
  }`

// El backend responde { error } o, si falla express-validator, { errors: [{ msg }] }
const mensajeDelServidor = (error, porDefecto) =>
  error.response?.data?.error || error.response?.data?.errors?.[0]?.msg ||
  (error.response ? porDefecto : 'No hay conexión con el servidor. Inténtalo de nuevo.')

// Pantalla a la que llega el enlace del correo de invitación (HU-3)
export default function AceptarInvitacion() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { session, perfil } = useAuth()

  const [invitacion, setInvitacion] = useState(undefined) // undefined = cargando
  const [errorCarga, setErrorCarga] = useState(null)
  const [cuentaCreadaSinSesion, setCuentaCreadaSinSesion] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting }
  } = useForm({ mode: 'onTouched', defaultValues: { nombre: '', password: '', confirmarPassword: '' } })

  useEffect(() => {
    validarInvitacion(token)
      .then(setInvitacion)
      .catch((error) => {
        setInvitacion(null)
        setErrorCarga(mensajeDelServidor(error, 'No pudimos validar tu invitación.'))
      })
  }, [token])

  const onSubmit = async ({ nombre, password }) => {
    try {
      await aceptarInvitacion(token, { nombre, password })
    } catch (error) {
      console.error('Error al aceptar invitación:', error)
      setError('root.servidor', {
        type: 'servidor',
        message: mensajeDelServidor(error, 'No pudimos crear tu cuenta. Inténtalo de nuevo.')
      })
      return
    }

    // La cuenta ya existe: se inicia sesión con ella (reemplaza cualquier sesión abierta)
    try {
      await login(invitacion.email, password)
      navigate('/app', { replace: true })
    } catch (error) {
      console.error('Cuenta creada pero no se pudo iniciar sesión:', error)
      setCuentaCreadaSinSesion(true)
    }
  }

  if (invitacion === undefined) {
    return <p className="text-gray-500">Validando tu invitación...</p>
  }

  if (errorCarga) {
    return (
      <section className="text-center space-y-3">
        <h1 className="text-2xl font-bold">Invitación no disponible</h1>
        <p role="alert" className="p-3 rounded-md text-sm bg-red-100 text-red-800">{errorCarga}</p>
        <Link to="/login">Ir a iniciar sesión</Link>
      </section>
    )
  }

  if (cuentaCreadaSinSesion) {
    return (
      <section className="text-center space-y-3">
        <h1 className="text-2xl font-bold">Tu cuenta está lista</h1>
        <p className="text-sm text-gray-600">
          Ya perteneces a <strong>{invitacion.empresa}</strong>. Inicia sesión con <strong>{invitacion.email}</strong>.
        </p>
        <Link to="/login" className="btn inline-block">Iniciar sesión</Link>
      </section>
    )
  }

  return (
    <section>
      <h1 className="text-2xl font-bold mb-1">Únete a {invitacion.empresa}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Te invitaron al grupo <strong>{invitacion.grupo}</strong> con el rol de <strong>{invitacion.rol}</strong>.
        Crea tu contraseña para entrar al CRM.
      </p>

      {session && (
        <div className="mb-4 p-3 rounded-md text-sm bg-amber-100 text-amber-800">
          Tienes abierta la sesión de {perfil?.usuario.email ?? session.user.email}. Al aceptar,
          entrarás con tu nueva cuenta.
        </div>
      )}

      {errors.root?.servidor && (
        <div role="alert" className="mb-4 p-3 rounded-md text-sm bg-red-100 text-red-800">
          {errors.root.servidor.message}{' '}
          {errors.root.servidor.message.includes('Inicia sesión') && <Link to="/login">Ir a iniciar sesión</Link>}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-gray-600 mb-1">Correo electrónico</label>
          <input
            id="email"
            type="email"
            value={invitacion.email}
            readOnly
            className="w-full border border-gray-200 bg-gray-50 text-gray-600 rounded-md p-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="nombre" className="block text-sm text-gray-600 mb-1">Tu nombre completo *</label>
          <input
            id="nombre"
            type="text"
            autoComplete="name"
            placeholder="Ej: Luis Pérez"
            className={claseInput(errors.nombre)}
            {...register('nombre', {
              required: 'Tu nombre es obligatorio',
              validate: (v) => v.trim().length > 0 || 'Tu nombre es obligatorio',
              maxLength: { value: 100, message: 'Máximo 100 caracteres' }
            })}
          />
          <ErrorMessage>{errors.nombre?.message}</ErrorMessage>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-600 mb-1">Contraseña *</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={claseInput(errors.password)}
            {...register('password', {
              required: 'La contraseña es obligatoria',
              deps: ['confirmarPassword'],
              minLength: { value: 8, message: 'Debe tener al menos 8 caracteres' },
              validate: {
                letra: (v) => /[A-Za-z]/.test(v) || 'Debe incluir al menos una letra',
                numero: (v) => /\d/.test(v) || 'Debe incluir al menos un número'
              }
            })}
          />
          <ErrorMessage>{errors.password?.message}</ErrorMessage>
        </div>

        <div>
          <label htmlFor="confirmarPassword" className="block text-sm text-gray-600 mb-1">Confirmar contraseña *</label>
          <input
            id="confirmarPassword"
            type="password"
            autoComplete="new-password"
            className={claseInput(errors.confirmarPassword)}
            {...register('confirmarPassword', {
              required: 'Confirma tu contraseña',
              validate: (v) => v === getValues('password') || 'Las contraseñas no coinciden'
            })}
          />
          <ErrorMessage>{errors.confirmarPassword?.message}</ErrorMessage>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn w-full disabled:opacity-60">
          {isSubmitting ? 'Creando tu cuenta...' : 'Aceptar invitación'}
        </button>
      </form>
    </section>
  )
}
