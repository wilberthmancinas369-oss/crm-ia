import { useCallback, useEffect, useState } from 'react'
import { actualizarOportunidad, listarOportunidades } from '../services/oportunidades'

// Oportunidades visibles para la cuenta (el backend filtra por empresa y grupo).
// Lo comparten la lista de Oportunidades y la vista Pipeline.
export function useOportunidades() {
  const [oportunidades, setOportunidades] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const recargar = useCallback(async () => {
    try {
      setError(null)
      setOportunidades(await listarOportunidades())
    } catch (err) {
      console.error('Error al cargar oportunidades:', err)
      setError(err.response?.data?.error || 'No se pudieron cargar las oportunidades.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { recargar() }, [recargar])

  // Actualiza en el servidor y reemplaza la oportunidad en la lista con lo que devuelve
  const actualizar = useCallback(async (id, datos) => {
    const actualizada = await actualizarOportunidad(id, datos)
    setOportunidades((prev) => prev.map((o) => (o.id === id ? actualizada : o)))
    return actualizada
  }, [])

  return { oportunidades, setOportunidades, cargando, error, recargar, actualizar }
}
