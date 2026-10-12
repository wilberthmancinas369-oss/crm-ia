import ErrorMessage from './ErrorMessage.jsx'

/**
 * Selector de grupo para formularios de alta (react-hook-form, campo `grupo_id`).
 * Con un solo grupo posible no se muestra: el backend usa ese grupo automáticamente.
 */
export default function SelectorGrupo({ grupos, register, error, className = '' }) {
  if (grupos.length <= 1) return null

  return (
    <div className={className}>
      <select
        aria-label="Grupo"
        className={`w-full border rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 ${
          error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
        }`}
        {...register('grupo_id', { required: 'Selecciona un grupo' })}
      >
        <option value="">-- Grupo * --</option>
        {grupos.map((g) => (
          <option key={g.id} value={g.id}>{g.nombre}</option>
        ))}
      </select>
      <ErrorMessage>{error?.message}</ErrorMessage>
    </div>
  )
}
