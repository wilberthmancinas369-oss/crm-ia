import { useId } from 'react';
import { useForm } from 'react-hook-form';

const claseInput = 'w-full min-w-0 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]';

// La misma barra y acciones en las tres pantallas, con los campos de cada lista.
export default function FiltrosListado({ campos, onAplicar, cargando }) {
  const id = useId();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: Object.fromEntries(campos.map((campo) => [campo.nombre, '']))
  });

  const aplicar = (valores) => onAplicar(Object.fromEntries(
    Object.entries(valores).map(([clave, valor]) => [clave, String(valor ?? '').trim()]).filter(([, valor]) => valor !== '')
  ));

  return (
    <section aria-label="Búsqueda y filtros" className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Buscar y filtrar</h2>
      <form onSubmit={handleSubmit(aplicar)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campos.map((campo) => (
            <div key={campo.nombre} className="min-w-0">
              <label htmlFor={`${id}-${campo.nombre}`} className="block text-sm text-gray-600 mb-1">{campo.etiqueta}</label>
              {campo.opciones ? (
                <select id={`${id}-${campo.nombre}`} className={claseInput} disabled={campo.deshabilitado}
                  {...register(campo.nombre)}>
                  {campo.opciones.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
                </select>
              ) : (
                <input id={`${id}-${campo.nombre}`} type={campo.tipo || 'search'} placeholder={campo.placeholder}
                  min={campo.tipo === 'number' ? '0' : undefined} step={campo.tipo === 'number' ? '0.01' : undefined}
                  className={claseInput} {...register(campo.nombre)} />
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => { reset(); onAplicar({}); }}>Limpiar</button>
          <button type="submit" className="btn disabled:opacity-60" disabled={cargando}>{cargando ? 'Buscando...' : 'Buscar'}</button>
        </div>
      </form>
    </section>
  );
}
