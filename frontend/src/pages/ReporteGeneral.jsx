import { useEffect, useState } from 'react';
import { obtenerReporteGeneralEmpresa } from '../services/reportes';
import { useAuth } from '../context/AuthContext';

const formatoMoneda = (monto) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);

export default function ReporteGeneral() {
  const { perfil, cargando: cargandoPerfil } = useAuth();
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const empresaId = perfil?.empresa?.id || perfil?.usuario?.empresa_id;

  useEffect(() => {
    if (cargandoPerfil) return; // espera a que cargue el perfil

    if (!empresaId) {
      setError('No se identificó la empresa del usuario actual.');
      setCargando(false);
      return;
    }

    let activo = true;
    (async () => {
      try {
        setCargando(true);
        setError(null);
        const data = await obtenerReporteGeneralEmpresa(empresaId);
        if (activo) setReporte(data);
      } catch (err) {
        console.error('Error al cargar reporte general:', err);
        if (activo) setError(err.response?.data?.error || 'No se pudo cargar el reporte general.');
      } finally {
        if (activo) setCargando(false);
      }
    })();

    return () => {
      activo = false;
    };
  }, [cargandoPerfil, empresaId]);

  if (cargandoPerfil || cargando) {
    return <p className="p-6 text-gray-500">Cargando comparativa de grupos...</p>;
  }
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Reporte General de la Empresa</h1>
        <p className="text-sm text-gray-500">Comparativa de métricas acumuladas por grupo</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-50 text-gray-500 border-b">
            <tr>
              <th className="py-3 px-4">Grupo</th>
              <th className="py-3 px-4 text-center">Miembros</th>
              <th className="py-3 px-4 text-center">Contactos</th>
              <th className="py-3 px-4 text-center">Oportunidades</th>
              <th className="py-3 px-4 text-right">Monto Total</th>
              <th className="py-3 px-4 text-right">Ticket Promedio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reporte?.grupos?.map((g) => (
              <tr key={g.grupo_id} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-semibold text-gray-800">{g.nombre}</td>
                <td className="py-3 px-4 text-center text-gray-700">{g.totalMiembros}</td>
                <td className="py-3 px-4 text-center text-gray-700">{g.totalContactos}</td>
                <td className="py-3 px-4 text-center text-gray-700 font-medium">{g.totalOportunidades}</td>
                <td className="py-3 px-4 text-right font-medium text-emerald-600">
                  {formatoMoneda(g.montoTotal)}
                </td>
                <td className="py-3 px-4 text-right text-gray-700">
                  {formatoMoneda(g.ticketPromedio)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}