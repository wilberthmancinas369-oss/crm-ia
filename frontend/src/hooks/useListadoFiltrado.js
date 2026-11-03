import { useCallback, useEffect, useRef, useState } from 'react';

// Comparte la carga de las tres listas sin filtrar sus catálogos de alta.
export function useListadoFiltrado(listar) {
  const [datos, setDatos] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const solicitud = useRef(0);
  const filtrosActuales = useRef(filtros);
  filtrosActuales.current = filtros;

  const recargar = useCallback(async () => {
    const numero = ++solicitud.current;
    setCargando(true);
    setError('');
    try {
      const resultado = await listar(filtrosActuales.current);
      if (numero === solicitud.current) setDatos(resultado);
    } catch (err) {
      if (numero === solicitud.current) {
        setDatos([]);
        setError(err.response?.data?.error || 'No se pudo cargar la lista. Inténtalo de nuevo.');
      }
    } finally {
      if (numero === solicitud.current) setCargando(false);
    }
  }, [listar]);

  useEffect(() => {
    recargar();
    // Una respuesta anterior no debe reemplazar los resultados de una búsqueda nueva.
    return () => { solicitud.current++; };
  }, [recargar, filtros]);

  return { datos, setDatos, filtros, setFiltros, cargando, error, recargar };
}
