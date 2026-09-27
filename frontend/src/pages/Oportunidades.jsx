import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCRM } from '../context/CRMContext.jsx';
import {
  listarOportunidades,
  crearOportunidad,
  eliminarOportunidad
} from '../services/oportunidades.js';
import {
  listarInteracciones,
  registrarInteraccion
} from '../services/interacciones.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Oportunidades() {
  const { contactos } = useCRM(); // Lista de contactos del estado global
  const [oportunidades, setOportunidades] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Oportunidad activa para ver sus interacciones
  const [oportunidadSeleccionada, setOportunidadSeleccionada] = useState(null);
  const [interacciones, setInteracciones] = useState([]);

  // Formulario Oportunidad (React Hook Form)
  const {
    register: registerOp,
    handleSubmit: handleSubmitOp,
    reset: resetOp,
    formState: { errors: errorsOp, isSubmitting: isSubmittingOp }
  } = useForm({
    defaultValues: {
      nombre_oportunidad: '',
      contacto_id: '',
      valor_estimado: '',
      etapa: 'Prospecto',
      probabilidad: 10
    }
  });

  // Formulario Interacción
  const {
    register: registerInt,
    handleSubmit: handleSubmitInt,
    reset: resetInt,
    formState: { errors: errorsInt }
  } = useForm({
    defaultValues: { tipo: 'Llamada', detalle: '' }
  });

  useEffect(() => {
    cargarOportunidades();
  }, []);

  const cargarOportunidades = async () => {
    try {
      setCargando(true);
      const data = await listarOportunidades();
      setOportunidades(data);
    } catch (error) {
      console.error('Error al cargar oportunidades:', error);
    } finally {
      setCargando(false);
    }
  };

  const onCrearOportunidad = async (data) => {
    try {
      const nueva = await crearOportunidad(data);
      // Actualización optimista del estado local
      setOportunidades((prev) => [nueva, ...prev]);
      resetOp();
    } catch (error) {
      alert('Error al crear la oportunidad');
    }
  };

  const handleEliminarOportunidad = async (id) => {
    if (!confirm('¿Deseas eliminar esta oportunidad?')) return;
    try {
      await eliminarOportunidad(id);
      setOportunidades((prev) => prev.filter((o) => o.id !== id));
      if (oportunidadSeleccionada?.id === id) setOportunidadSeleccionada(null);
    } catch (error) {
      alert('Error al eliminar la oportunidad');
    }
  };

  const handleVerInteracciones = async (oportunidad) => {
    setOportunidadSeleccionada(oportunidad);
    try {
      const data = await listarInteracciones({ oportunidadId: oportunidad.id });
      setInteracciones(data);
    } catch (error) {
      console.error('Error al cargar interacciones:', error);
    }
  };

  const onCrearInteraccion = async (data) => {
    if (!oportunidadSeleccionada) return;
    try {
      const nueva = await registrarInteraccion({
        ...data,
        contacto_id: oportunidadSeleccionada.contacto_id,
        oportunidad_id: oportunidadSeleccionada.id
      });
      setInteracciones((prev) => [nueva, ...prev]);
      resetInt();
    } catch (error) {
      alert('Error al registrar la interacción');
    }
  };

  if (cargando) {
    return <div className="flex justify-center items-center h-64 text-gray-500 font-medium">Cargando oportunidades...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Oportunidades de Venta</h1>
      </div>

      {/* FORMULARIO NUEVA OPORTUNIDAD */}
      <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Nueva Oportunidad</h2>
        <form onSubmit={handleSubmitOp(onCrearOportunidad)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Nombre Oportunidad */}
            <div>
              <input
                type="text"
                placeholder="Nombre de oportunidad *"
                className={`w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
                  errorsOp.nombre_oportunidad ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                }`}
                {...registerOp('nombre_oportunidad', { required: 'El nombre es obligatorio' })}
              />
              <ErrorMessage>{errorsOp.nombre_oportunidad?.message}</ErrorMessage>
            </div>

            {/* Selector de Contacto */}
            <div>
              <select
                className={`w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
                  errorsOp.contacto_id ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                }`}
                {...registerOp('contacto_id', { required: 'Seleccione un contacto' })}
              >
                <option value="">-- Seleccionar Contacto * --</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellido} ({c.empresa_cliente || 'Sin Empresa'})
                  </option>
                ))}
              </select>
              <ErrorMessage>{errorsOp.contacto_id?.message}</ErrorMessage>
            </div>

            {/* Valor Estimado */}
            <div>
              <input
                type="number"
                step="0.01"
                placeholder="Valor estimado ($)"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...registerOp('valor_estimado')}
              />
            </div>

            {/* Etapa */}
            <div>
              <select
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...registerOp('etapa')}
              >
                <option value="Prospecto">Prospecto</option>
                <option value="Calificado">Calificado</option>
                <option value="Propuesta">Propuesta</option>
                <option value="Ganado">Ganado</option>
                <option value="Perdido">Perdido</option>
              </select>
            </div>

            {/* Probabilidad */}
            <div>
              <input
                type="number"
                placeholder="Probabilidad (%)"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...registerOp('probabilidad', { min: 0, max: 100 })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingOp}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm rounded-md px-6 py-2 transition"
            >
              {isSubmittingOp ? 'Guardando...' : 'Guardar Oportunidad'}
            </button>
          </div>
        </form>
      </section>

      {/* TABLA DE OPORTUNIDADES Y PANEL LATERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${oportunidadSeleccionada ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Listado de Negociaciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b">
                <tr>
                  <th className="px-4 py-3">Oportunidad</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {oportunidades.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-400">No hay oportunidades registradas.</td>
                  </tr>
                ) : (
                  oportunidades.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{o.nombre_oportunidad}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        {o.valor_estimado ? `$${Number(o.valor_estimado).toLocaleString()}` : '$0.00'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          o.etapa === 'Ganado' ? 'bg-emerald-100 text-emerald-700' :
                          o.etapa === 'Perdido' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {o.etapa}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleVerInteracciones(o)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1 rounded-md text-xs font-semibold transition"
                        >
                          Historial
                        </button>
                        <button
                          onClick={() => handleEliminarOportunidad(o.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-md text-xs font-semibold transition"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL LATERAL DE HISTORIAL */}
        {oportunidadSeleccionada && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-base">{oportunidadSeleccionada.nombre_oportunidad}</h3>
                <p className="text-xs text-gray-500">Historial de avance del negocio</p>
              </div>
              <button onClick={() => setOportunidadSeleccionada(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmitInt(onCrearInteraccion)} className="space-y-3">
              <div className="flex gap-2">
                <select className="border border-gray-300 rounded-md p-2 text-sm" {...registerInt('tipo')}>
                  <option value="Llamada">Llamada</option>
                  <option value="Correo">Correo</option>
                  <option value="Reunión">Reunión</option>
                  <option value="Nota">Nota</option>
                </select>
                <input
                  type="text"
                  placeholder="Avance o nota *"
                  className="border border-gray-300 rounded-md p-2 text-sm flex-1"
                  {...registerInt('detalle', { required: 'El detalle no puede estar vacío' })}
                />
              </div>
              <ErrorMessage>{errorsInt.detalle?.message}</ErrorMessage>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-md transition">
                + Agregar Nota a Negocio
              </button>
            </form>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {interacciones.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Sin interacciones registradas en esta oportunidad.</p>
              ) : (
                interacciones.map((i) => (
                  <div key={i.id} className="p-3 bg-gray-50 rounded-md border text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold uppercase text-[10px] text-blue-700">{i.tipo}</span>
                      <span className="text-[10px] text-gray-400">{new Date(i.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-700 font-medium">{i.detalle}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}