import { useEffect, useState } from 'react';
import { reportesService } from '../services/reportes';

const formatoMoneda = (monto) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);

// HU-8: comparativa de todos los grupos de la empresa. Solo el Administrador (verReporteGeneral);
// la empresa la toma el backend del perfil de la sesión.
export default function ReporteGeneral() {
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    setReporte(null);
    setError(null);
    reportesService.getReporteGeneral()
      .then((data) => { if (activo) setReporte(data); })
      .catch((err) => {
        console.error('Error al cargar reporte general:', err);
        if (activo) setError(err.response?.data?.error || 'No se pudo cargar el reporte general.');
      });
    return () => { activo = false; };
  }, [intento]);

  if (error) {
    return (
      <div role="alert" className="max-w-7xl mx-auto">
        <div className="alerta alerta-error space-y-3">
          <p>{error}</p>
          <button type="button" className="btn btn-sm" onClick={() => setIntento((n) => n + 1)}>Reintentar</button>
        </div>
      </div>
    );
  }
  if (!reporte) return <p role="status" className="texto-suave">Cargando comparativa de grupos...</p>;

  const { totales, grupos } = reporte;
  const maximoMonto = Math.max(1, ...grupos.map((g) => g.montoTotal));
  const tarjetas = [
    { titulo: 'Grupos', valor: reporte.totalGrupos },
    { titulo: 'Contactos', valor: totales.totalContactos },
    { titulo: 'Oportunidades', valor: totales.totalOportunidades, nota: `${totales.oportunidadesGanadas} ganadas` },
    { titulo: 'Monto total estimado', valor: formatoMoneda(totales.montoTotal), nota: `Ganado: ${formatoMoneda(totales.montoGanado)}` }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>Reporte general de la empresa</h1>
          <p className="subtitulo">Comparativa de métricas acumuladas por grupo.</p>
        </div>
      </div>

      <div className="kpis">
        {tarjetas.map((t) => (
          <section key={t.titulo} className="kpi">
            <h2 className="kpi-titulo">{t.titulo}</h2>
            <p className="kpi-valor">{t.valor}</p>
            {t.nota && <p className="kpi-nota">{t.nota}</p>}
          </section>
        ))}
      </div>

      {grupos.length === 0 ? (
        <p className="texto-suave">Todavía no hay grupos en la empresa.</p>
      ) : (
        <>
          <section className="card space-y-4">
            <h2 className="card-titulo">Monto estimado por grupo</h2>
            <ul className="space-y-4">
              {grupos.map((g) => (
                <li key={g.grupo_id}>
                  <div className="flex justify-between gap-4 text-sm mb-1">
                    <span>{g.nombre}</span><span className="cifra">{formatoMoneda(g.montoTotal)}</span>
                  </div>
                  <div aria-hidden="true" className="barra">
                    <span className="barra-seg" style={{ width: `${g.montoTotal / maximoMonto * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="card-plana">
            <div className="overflow-x-auto">
              <table className="tabla">
                <caption className="sr-only">Miembros, contactos, oportunidades y montos de cada grupo de la empresa</caption>
                <thead>
                  <tr>
                    <th scope="col">Grupo</th>
                    <th scope="col" className="num">Miembros</th>
                    <th scope="col" className="num">Contactos</th>
                    <th scope="col" className="num">Oportunidades</th>
                    <th scope="col" className="num">Ganadas</th>
                    <th scope="col" className="num">Monto total</th>
                    <th scope="col" className="num">Ticket promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((g) => (
                    <tr key={g.grupo_id}>
                      <th scope="row">{g.nombre}</th>
                      <td className="num">{g.totalMiembros}</td>
                      <td className="num">{g.totalContactos}</td>
                      <td className="num">{g.totalOportunidades}</td>
                      <td className="num">{g.oportunidadesGanadas}</td>
                      <td className="num cifra">{formatoMoneda(g.montoTotal)}</td>
                      <td className="num">{formatoMoneda(g.ticketPromedio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}