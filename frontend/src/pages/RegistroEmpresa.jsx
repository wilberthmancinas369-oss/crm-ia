import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { registrarEmpresa } from '../services/auth.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Traduce un error de Supabase Auth a { campo, mensaje }. Sin campo, el mensaje va arriba del formulario.
function traducirErrorRegistro(error) {
  switch (error?.code) {
    case 'user_already_exists':
    case 'email_exists':
      return { campo: 'email', mensaje: 'Ya existe una cuenta con este correo. Inicia sesión o usa otro correo.' }
    case 'email_address_invalid':
      return { campo: 'email', mensaje: 'Este correo no es válido o su dominio no recibe correos. Usa un correo real.' }
    case 'weak_password':
      return { campo: 'password', mensaje: 'La contraseña es demasiado débil. Usa una más larga o combina letras, números y símbolos.' }
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return { mensaje: 'Se hicieron demasiados intentos en poco tiempo. Espera unos minutos y vuelve a intentarlo.' }
    case 'signup_disabled':
    case 'email_provider_disabled':
      return { mensaje: 'El registro de cuentas está deshabilitado por el momento. Contacta al equipo de soporte.' }
    case 'unexpected_failure':
      // Lo lanza Supabase cuando falla el trigger que crea la empresa ("Database error saving new user")
      return { mensaje: 'No pudimos crear tu empresa. No se guardó nada; intenta de nuevo en unos minutos.' }
  }

  // Sin respuesta del servidor: sin internet o Supabase caído
  if (error?.name === 'AuthRetryableFetchError' || error?.status === 0) {
    return { mensaje: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.' }
  }

  return { mensaje: 'Ocurrió un error inesperado al registrar la empresa. Inténtalo de nuevo.' }
}

// Mismas clases de input que en Contactos y FormularioGrupo
const claseInput = (conError) =>
  `w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
    conError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
  }`

export default function RegistroEmpresa() {
  const navigate = useNavigate()
  const [pendienteConfirmar, setPendienteConfirmar] = useState(null)

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting }
  } = useForm({
    mode: 'onTouched', // valida al salir de cada campo, no en cada tecla desde el inicio
    defaultValues: {
      nombreEmpresa: '',
      nombreAdmin: '',
      email: '',
      password: '',
      confirmarPassword: ''
    }
  })

  const onSubmit = async (datos) => {
    // confirmarPassword solo sirve para validar en cliente
    const { confirmarPassword, ...registro } = datos
    try {
      const { session } = await registrarEmpresa(registro)

      // Si "Confirm email" está activo en Supabase no hay sesión hasta que confirme su correo
      if (!session) {
        setPendienteConfirmar(registro.email)
        return
      }

      navigate('/app/bienvenida', { replace: true })
    } catch (error) {
      console.error('Error al registrar empresa:', error)
      const { campo, mensaje } = traducirErrorRegistro(error)
      setError(campo ?? 'root.servidor', { type: 'servidor', message: mensaje }, { shouldFocus: Boolean(campo) })
    }
  }

  if (pendienteConfirmar) {
    return (
      <section className="text-center space-y-3">
        <h1 className="text-2xl font-bold">Revisa tu correo</h1>
        <p className="text-sm text-gray-600">
          Enviamos un enlace de confirmación a <strong>{pendienteConfirmar}</strong>.
          Confírmalo para entrar a tu empresa.
        </p>
        <Link to="/login">Ir a iniciar sesión</Link>
      </section>
    )
  }

  return (
    <section>
      <h1 className="text-2xl font-bold mb-1">Registrar empresa</h1>
      <p className="text-sm text-gray-500 mb-6">
        Crea la cuenta de tu empresa. Tú serás su administrador.
      </p>

      {errors.root?.servidor && (
        <div role="alert" className="mb-4 p-3 rounded-md text-sm bg-red-100 text-red-800">
          {errors.root.servidor.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="nombreEmpresa" className="block text-sm text-gray-600 mb-1">Nombre de la empresa *</label>
          <input
            id="nombreEmpresa"
            type="text"
            autoComplete="organization"
            placeholder="Ej: Comercializadora del Norte"
            className={claseInput(errors.nombreEmpresa)}
            {...register('nombreEmpresa', {
              required: 'El nombre de la empresa es obligatorio',
              validate: (v) => v.trim().length > 0 || 'El nombre de la empresa es obligatorio',
              maxLength: { value: 100, message: 'Máximo 100 caracteres' }
            })}
          />
          <ErrorMessage>{errors.nombreEmpresa?.message}</ErrorMessage>
        </div>

        <div>
          <label htmlFor="nombreAdmin" className="block text-sm text-gray-600 mb-1">Tu nombre completo *</label>
          <input
            id="nombreAdmin"
            type="text"
            autoComplete="name"
            placeholder="Ej: Ana López"
            className={claseInput(errors.nombreAdmin)}
            {...register('nombreAdmin', {
              required: 'Tu nombre es obligatorio',
              validate: (v) => v.trim().length > 0 || 'Tu nombre es obligatorio',
              maxLength: { value: 100, message: 'Máximo 100 caracteres' }
            })}
          />
          <ErrorMessage>{errors.nombreAdmin?.message}</ErrorMessage>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm text-gray-600 mb-1">Correo electrónico *</label>
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
          <label htmlFor="password" className="block text-sm text-gray-600 mb-1">Contraseña *</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={claseInput(errors.password)}
            {...register('password', {
              required: 'La contraseña es obligatoria',
              deps: ['confirmarPassword'], // si cambia, vuelve a comparar con la confirmación
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
          {isSubmitting ? 'Registrando...' : 'Registrar empresa'}
        </button>
      </form>

      <p className="text-sm text-center mt-4">
        <Link to="/login">¿Ya tienes cuenta? Inicia sesión</Link>
      </p>
    </section>
  )
}
