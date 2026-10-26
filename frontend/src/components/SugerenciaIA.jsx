import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export default function SugerenciaIA({ oportunidadId }) {
  const [cargando, setCargando] = useState(false);
  const [sugerencia, setSugerencia] = useState('');
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(false);
  const solicitud = useRef(null);
  const botonAbrir = useRef(null);
  const devolverFoco = useRef(false);
  useEffect(() => {
    if (!abierto && devolverFoco.current) {
      botonAbrir.current?.focus();
      devolverFoco.current = false;
    }
  }, [abierto]);
  useEffect(() => {
    setSugerencia(''); setError(''); setCargando(false); setAbierto(false);
    return () => solicitud.current?.abort();
  }, [oportunidadId]);
  const generar = async () => {
    if (solicitud.current && !solicitud.current.signal.aborted && cargando) return;
    const controller = new AbortController();
    solicitud.current = controller;
    setAbierto(true); setCargando(true); setError(''); setSugerencia('');
    try {
      const { data } = await api.post(`/oportunidades/${oportunidadId}/sugerencia-ia`, {}, { signal: controller.signal, timeout: 45000 });
      if (!controller.signal.aborted) setSugerencia(data.sugerencia);
    } catch (err) {
      if (!controller.signal.aborted) setError(err.response?.data?.error || 'No se pudo obtener la sugerencia. Intenta nuevamente.');
    } finally {
      if (!controller.signal.aborted) setCargando(false);
    }
  };
  const cerrar = () => {
    solicitud.current?.abort();
    devolverFoco.current = true;
    setCargando(false); setAbierto(false); setError('');
  };
  return (
    <section aria-label="Sugerencia de IA" className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
      <div className="flex items-start gap-3 bg-gradient-to-r from-indigo-50 to-white p-4">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xl text-indigo-700">✦</span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-gray-900">Sugerencia de IA</h4>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">Un siguiente paso basado en la información disponible de esta oportunidad.</p>
        </div>
        {abierto && <button type="button" onClick={cerrar} aria-label="Cerrar sugerencia de IA" className="rounded-md px-2 py-1 text-gray-500 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-600">✕</button>}
      </div>
      <div className="space-y-4 p-4">
      <button ref={botonAbrir} type="button" aria-expanded={abierto} onClick={() => sugerencia ? setAbierto(true) : generar()} hidden={abierto}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        {sugerencia ? 'Ver sugerencia' : 'Obtener sugerencia de IA'}
      </button>
      {abierto && <>
        {cargando && <div role="status" className="flex items-center gap-3 rounded-lg bg-indigo-50 p-4 text-sm text-indigo-800">
          <span aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <span>Preparando el siguiente paso recomendado…</span>
        </div>}
        {error && <div role="alert" className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {sugerencia && <div role="status" className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">Recomendación principal</p>
          <h5 className="text-sm font-semibold text-gray-900">Siguiente paso recomendado</h5>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">{sugerencia}</p>
        </div>}
        <p className="text-xs leading-relaxed text-gray-500">Revisa la recomendación antes de actuar. Usa un resumen de etapa, monto y actividad, sin el contenido de las notas. No modifica datos ni crea tareas.</p>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3">
          <button type="button" onClick={cerrar} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Cerrar</button>
          <button type="button" onClick={generar} disabled={cargando} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-50">
            {cargando ? 'Generando…' : error ? 'Reintentar' : 'Volver a generar'}
          </button>
        </div>
      </>}
      </div>
    </section>
  );
}
