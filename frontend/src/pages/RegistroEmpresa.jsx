import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { registrarEmpresa } from '../services/auth.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mismas clases de input que en Contactos y FormularioGrupo
const claseInput = (conError) =>
  `w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
    conError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
  }`

export default function RegistroEmpresa() {
  const {
    register,
    handleSubmit,
    getValues,
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
      const { user, session } = await registrarEmpresa(registro)
      console.log('Empresa registrada:', { user, session })
    } catch (error) {
      // TODO (Tarea 3): mostrar mensajes claros en la UI (correo duplicado, etc.)
      console.error('Error al registrar empresa:', error)
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold mb-1">Registrar empresa</h1>
      <p className="text-sm text-gray-500 mb-6">
        Crea la cuenta de tu empresa. Tú serás su administrador.
      </p>

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
