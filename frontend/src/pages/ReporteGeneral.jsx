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
      <div role="alert" className="p-6 max-w-7xl mx-auto">
        <div className="rounded-md bg-red-50 text-red-800 p-4 space-y-3">
          <p>{error}</p>
          <button type="button" className="btn" onClick={() => setIntento((n) => n + 1)}>Reintentar</button>
        </div>
      </div>
    );
  }
  if (!reporte) return <p role="status" className="p-6 text-gray-500">Cargando comparativa de grupos...</p>;

  const { totales, grupos } = reporte;
  const maximoMonto = Math.max(1, ...grupos.map((g) => g.montoTotal));
  const tarjetas = [
    { titulo: 'Grupos', valor: reporte.totalGrupos },
    { titulo: 'Contactos', valor: totales.totalContactos },
    { titulo: 'Oportunidades', valor: `${totales.totalOportunidades} (${totales.oportunidadesGanadas} ganadas)` },
    { titulo: 'Monto total estimado', valor: formatoMoneda(totales.montoTotal), nota: `Ganado: ${formatoMoneda(totales.montoGanado)}` }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Reporte General de la Empresa</h1>
        <p className="text-sm text-gray-500">Comparativa de métricas acumuladas por grupo</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <section key={t.titulo} className="bg-white border rounded-lg p-5">
            <h2 className="text-sm text-gray-600">{t.titulo}</h2>
            <p className="text-2xl font-semibold mt-2">{t.valor}</p>
            {t.nota && <p className="text-xs text-gray-500 mt-2">{t.nota}</p>}
          </section>
        ))}
      </div>

      {grupos.length === 0 ? (
        <p className="text-gray-500">Todavía no hay grupos en la empresa.</p>
      ) : (
        <>
          <section className="bg-white border rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold">Monto estimado por grupo</h2>
            <ul className="space-y-4">
              {grupos.map((g) => (
                <li key={g.grupo_id}>
                  <div className="flex justify-between gap-4 text-sm mb-1">
                    <span>{g.nombre}</span><span>{formatoMoneda(g.montoTotal)}</span>
                  </div>
                  <div aria-hidden="true" className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${g.montoTotal / maximoMonto * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <caption className="sr-only">Miembros, contactos, oportunidades y montos de cada grupo de la empresa</caption>
              <thead className="text-xs uppercase bg-gray-50 text-gray-500 border-b">
                <tr>
                  <th scope="col" className="py-3 px-4">Grupo</th>
                  <th scope="col" className="py-3 px-4 text-center">Miembros</th>
                  <th scope="col" className="py-3 px-4 text-center">Contactos</th>
                  <th scope="col" className="py-3 px-4 text-center">Oportunidades</th>
                  <th scope="col" className="py-3 px-4 text-center">Ganadas</th>
                  <th scope="col" className="py-3 px-4 text-right">Monto Total</th>
                  <th scope="col" className="py-3 px-4 text-right">Ticket Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grupos.map((g) => (
                  <tr key={g.grupo_id} className="hover:bg-gray-50">
                    <th scope="row" className="py-3 px-4 font-semibold text-gray-800">{g.nombre}</th>
                    <td className="py-3 px-4 text-center text-gray-700">{g.totalMiembros}</td>
                    <td className="py-3 px-4 text-center text-gray-700">{g.totalContactos}</td>
                    <td className="py-3 px-4 text-center text-gray-700 font-medium">{g.totalOportunidades}</td>
                    <td className="py-3 px-4 text-center text-gray-700">{g.oportunidadesGanadas}</td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-600">{formatoMoneda(g.montoTotal)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatoMoneda(g.ticketPromedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
