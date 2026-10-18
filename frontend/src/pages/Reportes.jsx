import { useEffect, useState } from 'react';
import { reportesService } from '../services/reportes';
import { useAuth } from '../context/AuthContext';
import { listarGrupos } from '../services/grupos';

export default function Reportes() {
  const { perfil } = useAuth();
  const [grupos, setGrupos] = useState(null);
  const [grupoId, setGrupoId] = useState('');
  const [resultado, setResultado] = useState(null);
  const [errorGrupos, setErrorGrupos] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setGrupos(null);
    setGrupoId('');
    setResultado(null);
    setErrorGrupos(null);
    const cargar = async () => {
      try {
        const alcance = perfil.alcances?.verReporteGrupo;
        const permitidos = alcance === null
          ? (await listarGrupos()).map(g => ({ id: g.id, nombre: g.name }))
          : perfil.grupos.filter(g => alcance?.includes(g.id));
        if (!cancelado) {
          setGrupos(permitidos);
          setGrupoId(permitidos[0]?.id ?? '');
        }
      } catch {
        if (!cancelado) setErrorGrupos('No se pudieron cargar los grupos.');
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [perfil, intento]);

  useEffect(() => {
    if (!grupoId) return;
    let cancelado = false;
    setResultado(null);
    reportesService.getResumenJefe(grupoId)
      .then(data => { if (!cancelado) setResultado({ grupoId, data }); })
      .catch(() => {
        if (!cancelado) setResultado({ grupoId, error: 'No se pudo cargar el reporte. Intenta nuevamente.' });
      });
    return () => { cancelado = true; };
  }, [grupoId, intento]);

  // Nunca muestra los resultados del grupo anterior mientras cambia la selección.
  const vigente = resultado?.grupoId === grupoId ? resultado : null;
  const data = vigente?.data;
  const error = errorGrupos || vigente?.error;
  const agentes = Object.entries(data?.productividad ?? {})
    .sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre, 'es'));
  const tareasPendientes = agentes.reduce((total, [, agente]) => total + agente.pendientes, 0);
  const tareasVencidas = agentes.reduce((total, [, agente]) => total + agente.vencidas, 0);
  const maximoPendientes = Math.max(1, ...agentes.map(([, agente]) => agente.pendientes));
  const formatoMonto = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="border-b pb-4 space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">Reporte del Jefe de Área</h1>
        <p className="text-sm text-gray-600">Oportunidades, montos y tareas del grupo seleccionado.</p>
      </header>
      {grupos?.length > 0 && (
        <div className="max-w-sm">
          <label htmlFor="grupo-reporte" className="block text-sm font-medium mb-2">Grupo</label>
          <select id="grupo-reporte" className="w-full border rounded-md p-2 bg-white"
            value={grupoId} onChange={event => setGrupoId(event.target.value)}>
            {grupos.map(grupo => <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>)}
          </select>
        </div>
      )}
      {error ? (
        <div role="alert" className="rounded-md bg-red-50 text-red-800 p-4 space-y-3">
          <p>{error}</p>
          <button type="button" className="btn" onClick={() => setIntento(n => n + 1)}>Reintentar</button>
        </div>
      ) : grupos?.length === 0 ? (
        <p>No hay grupos disponibles para consultar.</p>
      ) : !data ? (
        <p role="status" className="text-gray-500">Cargando reporte...</p>
      ) : (
        <>
          {data.ventasDisponible === false ? (
            <section role="status" className="bg-white border rounded-lg p-5 space-y-2">
              <h2 className="text-lg font-semibold">Reporte por grupo no disponible</h2>
              <p>La configuración del reporte por grupo aún está pendiente. No es posible calcular los totales de este grupo.</p>
              <button type="button" className="btn" onClick={() => setIntento(n => n + 1)}>Reintentar</button>
            </section>
          ) : (
          <>
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="bg-white border rounded-lg p-5">
              <h2 className="text-sm text-gray-600">Oportunidades</h2>
              <p className="text-3xl font-semibold mt-2">{data.ventas.totalOportunidades}</p>
            </section>
            <section className="bg-white border rounded-lg p-5">
              <h2 className="text-sm text-gray-600">Monto total estimado</h2>
              <p className="text-3xl font-semibold mt-2">{formatoMonto.format(data.ventas.montoTotal)}</p>
              <p className="text-xs text-gray-500 mt-2">Suma de los montos registrados en todas las etapas.</p>
            </section>
          </div>
          <section className="bg-white border rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold">Oportunidades por etapa</h2>
            {data.ventas.totalOportunidades === 0 ? <p>No hay oportunidades en este grupo.</p> : (
              <ul className="space-y-4">
                {Object.entries(data.ventas.distribucionEtapas).map(([etapa, cantidad]) => (
                  <li key={etapa}>
                    <div className="flex justify-between gap-4 text-sm mb-1"><span>{etapa}</span><span>{cantidad}</span></div>
                    <div aria-hidden="true" className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${cantidad / data.ventas.totalOportunidades * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </>
          )}
          {data.productividadDisponible && (
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="bg-white border rounded-lg p-5">
                <h2 className="text-sm text-gray-600">Tareas pendientes</h2>
                <p className="text-3xl font-semibold mt-2">{tareasPendientes}</p>
                <p className="text-xs text-gray-500 mt-2">Incluye tareas en progreso y vencidas.</p>
              </section>
              <section className="bg-white border rounded-lg p-5">
                <h2 className="text-sm text-gray-600">Tareas vencidas</h2>
                <p className="text-3xl font-semibold mt-2 text-red-700">{tareasVencidas}</p>
                <p className="text-xs text-gray-500 mt-2">Forman parte del total de pendientes.</p>
              </section>
            </div>
          )}
          <section className="bg-white border rounded-lg p-5 space-y-2">
            <h2 className="text-lg font-semibold">Tareas por agente</h2>
            {!data.productividadDisponible ? (
              <p className="text-gray-600">La información de tareas pendientes y vencidas aún no está disponible.</p>
            ) : Object.keys(data.productividad).length === 0 ? (
              <p className="text-gray-600">No hay tareas pendientes en este grupo.</p>
            ) : (
              <>
                <p className="text-sm text-gray-600">Pendientes incluye tareas en progreso. Las vencidas forman parte de las pendientes.</p>
                <figure className="py-4 space-y-4">
                  <figcaption className="font-medium">Distribución de tareas por responsable</figcaption>
                  <p className="text-sm text-gray-600">Azul: sin vencer. Rojo: vencidas. Las barras comparten la misma escala.</p>
                  <ul className="space-y-4">
                    {agentes.map(([id, agente]) => (
                      <li key={id} className="space-y-1">
                        <div className="flex flex-wrap justify-between gap-2 text-sm">
                          <span className="break-words">{agente.nombre}</span>
                          <span>{agente.pendientes - agente.vencidas} sin vencer · {agente.vencidas} vencidas</span>
                        </div>
                        <div aria-hidden="true" className="flex h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div className="bg-blue-600" style={{ width: `${(agente.pendientes - agente.vencidas) / maximoPendientes * 100}%` }} />
                          <div className="bg-red-600" style={{ width: `${agente.vencidas / maximoPendientes * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </figure>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <caption className="sr-only">Tareas pendientes totales, sin vencer y vencidas por responsable del grupo seleccionado</caption>
                    <thead className="bg-gray-50 border-b">
                      <tr><th scope="col" className="p-3">Responsable</th><th scope="col" className="p-3 text-right">Pendientes totales</th><th scope="col" className="p-3 text-right">Sin vencer</th><th scope="col" className="p-3 text-right">Vencidas</th></tr>
                    </thead>
                    <tbody>
                      {agentes
                        .map(([id, agente]) => (
                          <tr key={id} className="border-b">
                            <th scope="row" className="p-3 font-medium">{agente.nombre}</th>
                            <td className="p-3 text-right">{agente.pendientes}</td>
                            <td className="p-3 text-right">{agente.pendientes - agente.vencidas}</td>
                            <td className={`p-3 text-right ${agente.vencidas > 0 ? 'text-red-700 font-semibold' : ''}`}>{agente.vencidas}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
