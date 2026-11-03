import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export default function PrioridadesIA({ onVer, oportunidades }) {
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const solicitud = useRef(null);
  useEffect(() => {
    setResultado(null); setError(''); setCargando(false);
    return () => { solicitud.current?.abort(); solicitud.current = null; };
  }, [oportunidades]);
  const generar = async () => {
    if (solicitud.current) return;
    const controller = new AbortController(); solicitud.current = controller;
    setCargando(true); setError(''); setResultado(null);
    try {
      const { data } = await api.post('/oportunidades/prioridades-ia', {}, { signal: controller.signal, timeout: 60000 });
      if (!controller.signal.aborted) setResultado(data);
    } catch (err) {
      if (!controller.signal.aborted) setError(err.response?.data?.error || 'No se pudieron obtener las prioridades. Intenta nuevamente.');
    } finally {
      if (solicitud.current === controller) { solicitud.current = null; setCargando(false); }
    }
  };
  return <section aria-label="Prioridades de oportunidades" className="rounded-xl border border-indigo-100 bg-white p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold text-gray-900">¿Qué oportunidades atender primero?</h2>
        <p className="text-sm text-gray-600">Compara hasta las 20 oportunidades abiertas más recientes a las que tienes acceso.</p></div>
      <button type="button" onClick={generar} disabled={cargando} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
        {cargando ? 'Analizando…' : 'Priorizar oportunidades con IA'}
      </button>
    </div>
    {cargando && <p role="status" className="text-sm text-indigo-700">Comparando seguimiento, tareas, etapa, monto y cierre previsto…</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {resultado && <div className="space-y-3">
      <p role="status" className="text-sm text-gray-600">{resultado.analizadas === 0 ? 'No hay oportunidades abiertas para priorizar.' : `Se analizaron ${resultado.analizadas} oportunidades. Orden orientativo basado en los datos registrados.`}</p>
      {resultado.parcial && <p className="text-sm text-amber-800">Hay más oportunidades abiertas: este resultado solo compara las 20 más recientes.</p>}
      <ol className="space-y-2">{resultado.prioridades.map((p, i) => <li key={p.id} className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
        <h3 className="font-semibold text-gray-900">{i + 1}. {p.nombre}</h3>
        <p className="my-2 whitespace-pre-wrap break-words text-sm text-gray-700">{p.motivo}</p>
        <button type="button" onClick={() => onVer(p.id)} className="text-sm font-semibold text-indigo-700 underline">Ver oportunidad</button>
      </li>)}</ol>
      <p className="text-xs text-gray-500">Revisa los motivos antes de decidir. La recomendación no cambia las oportunidades ni crea tareas.</p>
      <button type="button" onClick={() => setResultado(null)} className="text-sm text-gray-600 underline">Ocultar prioridades</button>
    </div>}
  </section>;
}
