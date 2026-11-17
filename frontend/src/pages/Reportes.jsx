import { useEffect, useState } from 'react';
import { reportesService } from '../services/reportes';
import { useAuth } from '../context/AuthContext';
import { listarGrupos } from '../services/grupos';
import { tonoEtapa } from '../constants/estilos';
import { Cargando, ErrorCarga } from '../components/EstadoVista';

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
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="page-header">
        <div>
          <h1>Reporte del Jefe de Área</h1>
          <p className="subtitulo">Oportunidades, montos y tareas del grupo seleccionado.</p>
        </div>
        {grupos?.length > 0 && (
          <div className="campo w-full sm:w-72">
            <label htmlFor="grupo-reporte">Grupo</label>
            <select id="grupo-reporte" className="input"
              value={grupoId} onChange={event => setGrupoId(event.target.value)}>
              {grupos.map(grupo => <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>)}
            </select>
          </div>
        )}
      </header>
      {error ? (
        <ErrorCarga onReintentar={() => setIntento(n => n + 1)}>{error}</ErrorCarga>
      ) : grupos?.length === 0 ? (
        <p className="texto-suave" role="status">No hay grupos disponibles para consultar.</p>
      ) : !data ? (
        <Cargando>Cargando reporte…</Cargando>
      ) : (
        <>
          {data.ventasDisponible === false ? (
            <section role="status" className="card space-y-2">
              <h2 className="card-titulo">Reporte por grupo no disponible</h2>
              <p>La configuración del reporte por grupo aún está pendiente. No es posible calcular los totales de este grupo.</p>
              <button type="button" className="btn btn-sm" onClick={() => setIntento(n => n + 1)}>Reintentar</button>
            </section>
          ) : (
          <>
          <div className="kpis">
            <section className="kpi">
              <h2 className="kpi-titulo">Oportunidades</h2>
              <p className="kpi-valor">{data.ventas.totalOportunidades}</p>
            </section>
            <section className="kpi">
              <h2 className="kpi-titulo">Monto total estimado</h2>
              <p className="kpi-valor">{formatoMonto.format(data.ventas.montoTotal)}</p>
              <p className="kpi-nota">Suma de los montos registrados en todas las etapas.</p>
            </section>
          </div>
          <section className="card space-y-4">
            <h2 className="card-titulo">Oportunidades por etapa</h2>
            {data.ventas.totalOportunidades === 0 ? <p className="texto-suave">No hay oportunidades en este grupo.</p> : (
              <ul className="space-y-4">
                {Object.entries(data.ventas.distribucionEtapas).map(([etapa, cantidad]) => (
                  <li key={etapa} className={tonoEtapa(etapa)}>
                    <div className="flex justify-between gap-4 text-sm mb-1"><span>{etapa}</span><span className="cifra">{cantidad}</span></div>
                    <div aria-hidden="true" className="barra">
                      <span className="barra-seg" style={{ width: `${cantidad / data.ventas.totalOportunidades * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </>
          )}
          {data.productividadDisponible && (
            <div className="kpis">
              <section className="kpi">
                <h2 className="kpi-titulo">Tareas pendientes</h2>
                <p className="kpi-valor">{tareasPendientes}</p>
                <p className="kpi-nota">Incluye tareas en progreso y vencidas.</p>
              </section>
              <section className="kpi">
                <h2 className="kpi-titulo">Tareas vencidas</h2>
                <p className="kpi-valor peligro">{tareasVencidas}</p>
                <p className="kpi-nota">Forman parte del total de pendientes.</p>
              </section>
            </div>
          )}
          <section className="card space-y-2">
            <h2 className="card-titulo">Tareas por agente</h2>
            {!data.productividadDisponible ? (
              <p className="texto-suave">La información de tareas pendientes y vencidas aún no está disponible.</p>
            ) : Object.keys(data.productividad).length === 0 ? (
              <p className="texto-suave">No hay tareas pendientes en este grupo.</p>
            ) : (
              <>
                <p className="text-sm texto-suave">Pendientes incluye tareas en progreso. Las vencidas forman parte de las pendientes.</p>
                <figure className="py-4 space-y-4">
                  <figcaption className="font-bold text-[var(--color-heading)]">Distribución de tareas por responsable</figcaption>
                  <p className="text-sm texto-suave">Azul: sin vencer. Rojo: vencidas. Las barras comparten la misma escala.</p>
                  <ul className="space-y-4">
                    {agentes.map(([id, agente]) => (
                      <li key={id} className="space-y-1">
                        <div className="flex flex-wrap justify-between gap-2 text-sm">
                          <span className="break-words">{agente.nombre}</span>
                          <span>{agente.pendientes - agente.vencidas} sin vencer · {agente.vencidas} vencidas</span>
                        </div>
                        <div aria-hidden="true" className="barra">
                          <span className="barra-seg tono-abierta-0" style={{ width: `${(agente.pendientes - agente.vencidas) / maximoPendientes * 100}%` }} />
                          <span className="barra-seg tono-perdida" style={{ width: `${agente.vencidas / maximoPendientes * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </figure>
                <div className="overflow-x-auto">
                  <table className="tabla">
                    <caption className="sr-only">Tareas pendientes totales, sin vencer y vencidas por responsable del grupo seleccionado</caption>
                    <thead>
                      <tr><th scope="col">Responsable</th><th scope="col" className="num">Pendientes totales</th><th scope="col" className="num">Sin vencer</th><th scope="col" className="num">Vencidas</th></tr>
                    </thead>
                    <tbody>
                      {agentes
                        .map(([id, agente]) => (
                          <tr key={id}>
                            <th scope="row">{agente.nombre}</th>
                            <td className="num">{agente.pendientes}</td>
                            <td className="num">{agente.pendientes - agente.vencidas}</td>
                            <td className={`num ${agente.vencidas > 0 ? 'text-[var(--color-danger)] font-bold' : ''}`}>{agente.vencidas}</td>
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
