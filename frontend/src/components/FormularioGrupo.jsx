import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { crearGrupo } from '../services/grupos.js';
import ErrorMessage from './ErrorMessage.jsx';

/**
 * Formulario para crear un nuevo grupo.
 * Consume el endpoint POST /api/grupos.
 */
export default function FormularioGrupo({ onCreado }) {
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({ defaultValues: { name: '', description: '' } });

  const onSubmit = async (datos) => {
    setMensaje({ tipo: '', texto: '' });
    try {
      const { group } = await crearGrupo(datos);
      setMensaje({ tipo: 'exito', texto: '¡Grupo creado exitosamente!' });
      reset();
      onCreado?.(group);
    } catch (error) {
      const texto =
        error.response?.data?.error ||
        error.response?.data?.errors?.[0]?.msg ||
        'Ocurrió un error al crear el grupo';
      setMensaje({ tipo: 'error', texto });
    }
  };

  return (
    <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 max-w-md">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Crear nuevo grupo</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm text-gray-600 mb-1">Nombre del grupo *</label>
          <input
            id="name"
            type="text"
            placeholder="Ej: Ventas Norte"
            className={`w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
              errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
            }`}
            {...register('name', {
              required: 'El nombre del grupo es obligatorio',
              maxLength: { value: 100, message: 'El nombre no puede exceder los 100 caracteres' }
            })}
          />
          <ErrorMessage>{errors.name?.message}</ErrorMessage>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm text-gray-600 mb-1">Descripción (opcional)</label>
          <textarea
            id="description"
            placeholder="Ej: Equipo encargado de la zona norte"
            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register('description')}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creando...' : 'Crear grupo'}
        </button>
      </form>

      {mensaje.texto && (
        <div
          className={`mt-4 p-2 rounded-md text-sm ${
            mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {mensaje.texto}
        </div>
      )}
    </section>
  );
}
