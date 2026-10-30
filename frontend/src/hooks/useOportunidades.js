import { actualizarOportunidad, listarOportunidades } from '../services/oportunidades'
import { useListadoFiltrado } from './useListadoFiltrado'

// Oportunidades visibles para la cuenta (el backend filtra por empresa y grupo).
// Lo comparten la lista de Oportunidades y la vista Pipeline.
export function useOportunidades() {
  const { datos: oportunidades, setDatos: setOportunidades, ...listado } = useListadoFiltrado(listarOportunidades)

  // Recarga con los filtros activos: cambiar de etapa puede quitarla de esta lista.
  const actualizar = async (id, datos) => {
    const actualizada = await actualizarOportunidad(id, datos)
    await listado.recargar()
    return actualizada
  }

  return { oportunidades, setOportunidades, ...listado, actualizar }
}
