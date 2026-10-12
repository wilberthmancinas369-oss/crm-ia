import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { enviarInvitacion } from '../services/invitaciones';
import { useGruposPermitidos } from '../hooks/useGruposPermitidos';
import { listarRolesInvitables } from '../services/roles';
import ErrorMessage from '../components/ErrorMessage';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mismas clases de input que en Contactos y RegistroEmpresa
const claseInput = (conError) =>
  `w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
    conError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
  }`;

// El backend responde { error } o, si falla express-validator, { errors: [{ msg }] }
const mensajeDelServidor = (error, porDefecto) =>
  error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || porDefecto;

export default function InvitarUsuario() {
  // Solo los grupos donde la cuenta puede invitar (el Jefe de Área, los que dirige)
  const groups = useGruposPermitidos('invitarUsuarios');
  const [roles, setRoles] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({ defaultValues: { email: '', grupoId: '', rolId: '' } });

  // Los roles asignables dependen del grupo elegido (backend: rolMaximoAsignable)
  const grupoId = watch('grupoId');
  useEffect(() => {
    setValue('rolId', '');
    if (!grupoId) {
      setRoles([]);
      return;
    }
    listarRolesInvitables(grupoId)
      .then(setRoles)
      .catch((error) => {
        console.error('Error cargando roles:', error);
        setRoles([]);
        setMessage({ type: 'error', text: mensajeDelServidor(error, 'No se pudieron cargar los roles.') });
      });
  }, [grupoId, setValue]);

  const onSubmit = async ({ email, grupoId, rolId }) => {
    setMessage({ type: '', text: '' });
    try {
      await enviarInvitacion({ email: email.trim(), grupoId, rolId });
      setMessage({ type: 'success', text: `Invitación enviada con éxito a ${email}` });
      reset();
    } catch (error) {
      console.error('Error enviando invitación:', error);
      setMessage({ type: 'error', text: mensajeDelServidor(error, 'Hubo un problema al enviar la invitación.') });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Invitar usuario</h1>
        <p className="text-sm text-gray-500 mt-1">
          El invitado recibirá un correo con un enlace válido por 7 días.
        </p>
      </div>

      <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-600 mb-1">Correo electrónico *</label>
            <input
              id="email"
              type="email"
              placeholder="ejemplo@correo.com"
              className={claseInput(errors.email)}
              {...register('email', {
                required: 'El correo es obligatorio',
                pattern: { value: EMAIL_REGEX, message: 'Ingresa un correo válido' }
              })}
            />
            <ErrorMessage>{errors.email?.message}</ErrorMessage>
          </div>

          <div>
            <label htmlFor="grupoId" className="block text-sm text-gray-600 mb-1">Grupo *</label>
            <select
              id="grupoId"
              className={claseInput(errors.grupoId)}
              {...register('grupoId', { required: 'Selecciona un grupo' })}
            >
              <option value="">Selecciona un grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.nombre}</option>
              ))}
            </select>
            <ErrorMessage>{errors.grupoId?.message}</ErrorMessage>
          </div>

          <div>
            <label htmlFor="rolId" className="block text-sm text-gray-600 mb-1">Rol *</label>
            <select
              id="rolId"
              className={claseInput(errors.rolId)}
              {...register('rolId', { required: 'Selecciona un rol' })}
            >
              <option value="">Selecciona un rol</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>{rol.name}</option>
              ))}
            </select>
            <ErrorMessage>{errors.rolId?.message}</ErrorMessage>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn disabled:opacity-60">
              {isSubmitting ? 'Enviando...' : 'Enviar invitación'}
            </button>
            <Link to="/app/grupos" className="text-sm text-gray-600">Volver a Grupos</Link>
          </div>
        </form>

        {message.text && (
          <div
            role="alert"
            className={`mt-4 p-3 rounded-md text-sm ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}
      </section>
    </div>
  );
}
