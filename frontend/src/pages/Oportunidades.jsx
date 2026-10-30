import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SugerenciaIA from '../components/SugerenciaIA.jsx';
import { useForm } from 'react-hook-form';
import { useCRM } from '../context/CRMContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import FiltrosListado from '../components/FiltrosListado.jsx';
import { useResponsablesFiltro } from '../hooks/useResponsablesFiltro.js';
import {
  crearOportunidad,
  eliminarOportunidad,
  obtenerOportunidadPorId,
  agregarColaborador,
  quitarColaborador,
  reasignarOportunidad,
  obtenerHistorialReasignaciones
} from '../services/oportunidades.js';
import { listarInteracciones, registrarInteraccion } from '../services/interacciones.js';
import { listarAsignables } from '../services/grupos.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { useOportunidades } from '../hooks/useOportunidades.js';
import { tienePermisoEnGrupo } from '../hooks/useGruposPermitidos.js';
import { ETAPAS, ETAPA_INICIAL, claseEtapa, formatoFecha, formatoMonto } from '../constants/crm.js';

const claseInput = (conError) =>
  `w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
    conError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
  }`;

// El backend responde { error } o, si falla express-validator, { errors: [{ msg }] }
const mensajeDelServidor = (error, porDefecto) =>
  error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || porDefecto;

// La reasignación (HU-7) puede responder { error }, { message } (404) o { errors: [{ msg }] }
const mensajeDeReasignacion = (error) =>
  error.response?.data?.error ||
  error.response?.data?.message ||
  error.response?.data?.errors?.[0]?.msg ||
  'No se pudo reasignar la oportunidad';

const nombreDe = (usuario) => usuario?.full_name || usuario?.nombre || usuario?.email || '—';

// ---------- Alta de oportunidad ----------
function FormularioOportunidad({ contactos, onCreada }) {
  const { perfil } = useAuth();
  const [asignables, setAsignables] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      nombre_oportunidad: '', contacto_id: '', valor_estimado: '', etapa: ETAPA_INICIAL,
      probabilidad: 10, fecha_cierre_prevista: '', responsable_id: ''
    }
  });

  // La oportunidad toma el grupo de su contacto; ahí se decide si se puede elegir otro responsable
  const contacto = contactos.find((c) => c.id === watch('contacto_id'));
  const grupoId = contacto?.group_id;
  const puedeAsignar = Boolean(grupoId) && tienePermisoEnGrupo(perfil, 'asignarResponsable', grupoId);

  useEffect(() => {
    setValue('responsable_id', '');
    if (!puedeAsignar) { setAsignables([]); return; }
    listarAsignables(grupoId).then(setAsignables).catch(() => setAsignables([]));
  }, [grupoId, puedeAsignar, setValue]);

  const onSubmit = async ({ responsable_id, ...datos }) => {
    try {
      // Sin responsable elegido, el backend asigna a quien la crea
      const nueva = await crearOportunidad(responsable_id ? { ...datos, responsable_id } : datos);
      reset();
      onCreada(nueva);
    } catch (error) {
      alert(mensajeDelServidor(error, 'Error al crear la oportunidad'));
    }
  };

  return (
    <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Nueva oportunidad</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <input type="text" placeholder="Nombre de la oportunidad * (ej. 50 licencias para ACME)" className={claseInput(errors.nombre_oportunidad)}
              {...register('nombre_oportunidad', { required: 'El nombre es obligatorio' })} />
            <ErrorMessage>{errors.nombre_oportunidad?.message}</ErrorMessage>
          </div>
          <div className="lg:col-span-2">
            <select className={claseInput(errors.contacto_id)} {...register('contacto_id', { required: 'Selecciona un contacto' })}>
              <option value="">-- Contacto * --</option>
              {contactos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido}{c.empresa_cliente ? ` (${c.empresa_cliente})` : ''}</option>
              ))}
            </select>
            <ErrorMessage>{errors.contacto_id?.message}</ErrorMessage>
            {contactos.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Primero registra un contacto en <Link to="/app/contactos" className="text-blue-600 hover:underline">Contactos</Link>.</p>
            )}
          </div>
          <div>
            <label htmlFor="op-monto" className="block text-xs text-gray-600 mb-1">Monto ($)</label>
            <input id="op-monto" type="number" step="0.01" min="0" placeholder="Ej. 45000" className={claseInput(errors.valor_estimado)}
              {...register('valor_estimado', { min: { value: 0, message: 'No puede ser negativo' } })} />
            <ErrorMessage>{errors.valor_estimado?.message}</ErrorMessage>
          </div>
          <div>
            <label htmlFor="op-cierre" className="block text-xs text-gray-600 mb-1">Fecha de cierre prevista</label>
            <input id="op-cierre" type="date" className={claseInput(false)} {...register('fecha_cierre_prevista')} />
          </div>
          <div>
            <label htmlFor="op-etapa" className="block text-xs text-gray-600 mb-1">Etapa</label>
            <select id="op-etapa" className={claseInput(false)} {...register('etapa')}>
              {ETAPAS.map((e) => <option key={e.valor} value={e.valor}>{e.valor}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="op-probabilidad" className="block text-xs text-gray-600 mb-1">Probabilidad de ganarla (%)</label>
            <input id="op-probabilidad" type="number" min="0" max="100" className={claseInput(errors.probabilidad)}
              {...register('probabilidad', { min: { value: 0, message: 'Entre 0 y 100' }, max: { value: 100, message: 'Entre 0 y 100' } })} />
            <ErrorMessage>{errors.probabilidad?.message}</ErrorMessage>
          </div>
          {puedeAsignar && (
            <div className="lg:col-span-2">
              <label htmlFor="op-responsable" className="block text-xs text-gray-600 mb-1">Responsable</label>
              <select id="op-responsable" className={claseInput(false)} {...register('responsable_id')}>
                <option value="">Yo</option>
                {asignables.filter((u) => u.id !== perfil.usuario.id).map((u) => (
                  <option key={u.id} value={u.id}>{nombreDe(u)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm rounded-md px-6 py-2 transition">
            {isSubmitting ? 'Guardando...' : 'Guardar oportunidad'}
          </button>
        </div>
      </form>
    </section>
  );
}

// ---------- Detalle: responsable, colaboradores, interacciones e historial de reasignaciones ----------
function DetalleOportunidad({ id, onCerrar, onReasignada }) {
  const { perfil } = useAuth();
  const [oportunidad, setOportunidad] = useState(null);
  const [asignables, setAsignables] = useState([]);
  const [interacciones, setInteracciones] = useState([]);
  const [colaboradorNuevo, setColaboradorNuevo] = useState('');
  // Reasignación (HU-7)
  const [reasignando, setReasignando] = useState(false);
  const [nuevoResponsable, setNuevoResponsable] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { tipo: 'Llamada', detalle: '' } });

  const cargar = async () => {
    try {
      const datos = await obtenerOportunidadPorId(id);
      setOportunidad(datos);
      setInteracciones(await listarInteracciones({ oportunidadId: id }));
    } catch (error) {
      alert(mensajeDelServidor(error, 'No se pudo cargar la oportunidad'));
    }
  };

  useEffect(() => { cargar(); }, [id]);

  // El historial se carga aparte: si falla, el resto del detalle sigue funcionando
  const cargarHistorial = async () => {
    try {
      setErrorHistorial(null);
      const datos = await obtenerHistorialReasignaciones(id);
      setHistorial(Array.isArray(datos) ? datos : []);
    } catch (error) {
      console.error('Error al cargar el historial de reasignaciones:', error);
      setHistorial([]);
      setErrorHistorial('No se pudo cargar el historial de reasignaciones.');
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => { cargarHistorial(); }, [id]);

  const grupoId = oportunidad?.group_id;
  const esJefeDelGrupo = grupoId && tienePermisoEnGrupo(perfil, 'asignarResponsable', grupoId);
  const puedeGestionar = oportunidad && (oportunidad.responsable_id === perfil.usuario.id || esJefeDelGrupo);

  useEffect(() => {
    if (!grupoId || !puedeGestionar) return;
    listarAsignables(grupoId).then(setAsignables).catch(() => setAsignables([]));
  }, [grupoId, puedeGestionar]);

  if (!oportunidad) {
    return <div className="bg-white rounded-lg border border-gray-200 p-5 text-sm text-gray-500">Cargando…</div>;
  }

  const colaboradores = oportunidad.colaboradores ?? [];
  const disponibles = asignables.filter(
    (u) => u.id !== oportunidad.responsable_id && !colaboradores.some((c) => c.user_id === u.id)
  );

  // Posibles nuevos responsables: los del grupo, sin el responsable actual
  const candidatos = asignables.filter((u) => u.id !== oportunidad.responsable_id);

  const cancelarReasignacion = () => {
    setReasignando(false);
    setNuevoResponsable('');
  };

  // El responsable solo se cambia por aquí (PATCH /reasignar) para que quede en el historial
  const confirmarReasignacion = async () => {
    if (!nuevoResponsable || enviando) return;
    const destino = candidatos.find((u) => u.id === nuevoResponsable);
    if (!confirm(`¿Reasignar esta oportunidad de ${nombreDe(oportunidad.responsable)} a ${nombreDe(destino)}?`)) return;

    setEnviando(true);
    try {
      await reasignarOportunidad(id, nuevoResponsable);
      cancelarReasignacion();
      await Promise.all([cargar(), cargarHistorial(), onReasignada()]);
    } catch (error) {
      alert(mensajeDeReasignacion(error));
    } finally {
      setEnviando(false);
    }
  };

  const agregar = async () => {
    if (!colaboradorNuevo) return;
    try {
      await agregarColaborador(id, colaboradorNuevo);
      setColaboradorNuevo('');
      await cargar();
    } catch (error) {
      alert(mensajeDelServidor(error, 'No se pudo agregar el colaborador'));
    }
  };

  const quitar = async (userId) => {
    try {
      await quitarColaborador(id, userId);
      await cargar();
    } catch (error) {
      alert(mensajeDelServidor(error, 'No se pudo quitar el colaborador'));
    }
  };

  const onCrearInteraccion = async (datos) => {
    try {
      await registrarInteraccion({ ...datos, contacto_id: oportunidad.contacto_id, oportunidad_id: id });
      reset();
      setInteracciones(await listarInteracciones({ oportunidadId: id }));
    } catch (error) {
      alert(mensajeDelServidor(error, 'Error al registrar la interacción'));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-5">
      <div className="flex justify-between items-start border-b pb-3">
        <div>
          <h3 className="font-bold text-gray-800 text-base">{oportunidad.nombre_oportunidad}</h3>
          <p className="text-xs text-gray-500">
            {oportunidad.contactos?.nombre} {oportunidad.contactos?.apellido} · {formatoMonto(oportunidad.valor_estimado)} · cierre {formatoFecha(oportunidad.fecha_cierre_prevista)}
          </p>
        </div>
        <button onClick={onCerrar} aria-label="Cerrar detalle" className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
      </div>

      <SugerenciaIA key={id} oportunidadId={id} />
      <section>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Responsable</h4>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-800">{oportunidad.responsable ? nombreDe(oportunidad.responsable) : 'Sin responsable'}</p>
          {esJefeDelGrupo && !reasignando && (
            <button onClick={() => setReasignando(true)} className="btn shrink-0">Reasignar</button>
          )}
        </div>
        {esJefeDelGrupo && reasignando && (
          <div className="mt-2 space-y-2">
            {candidatos.length === 0 ? (
              <p className="text-xs text-gray-500">No hay otras personas en este grupo a quienes reasignar.</p>
            ) : (
              <select aria-label="Nuevo responsable" className={claseInput(false)} value={nuevoResponsable}
                onChange={(e) => setNuevoResponsable(e.target.value)} disabled={enviando}>
                <option value="">Selecciona al nuevo responsable…</option>
                {candidatos.map((u) => <option key={u.id} value={u.id}>{nombreDe(u)}</option>)}
              </select>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={cancelarReasignacion} disabled={enviando} className="btn disabled:opacity-50">Cancelar</button>
              <button onClick={confirmarReasignacion} disabled={!nuevoResponsable || enviando} className="btn disabled:opacity-50">
                {enviando ? 'Reasignando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Colaboradores</h4>
        {colaboradores.length === 0 ? (
          <p className="text-xs text-gray-400 mb-2">Nadie más colabora en esta oportunidad.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm mb-2">
            {colaboradores.map((c) => (
              <li key={c.user_id} className="py-1.5 flex justify-between items-center">
                <span className="text-gray-800">{nombreDe(c.usuario)}</span>
                {(puedeGestionar || c.user_id === perfil.usuario.id) && (
                  <button onClick={() => quitar(c.user_id)} className="text-xs text-red-600 hover:underline">
                    {c.user_id === perfil.usuario.id ? 'Salirme' : 'Quitar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {puedeGestionar && disponibles.length > 0 && (
          <div className="flex gap-2">
            <select aria-label="Agregar colaborador" className={claseInput(false)} value={colaboradorNuevo} onChange={(e) => setColaboradorNuevo(e.target.value)}>
              <option value="">Agregar colaborador…</option>
              {disponibles.map((u) => <option key={u.id} value={u.id}>{nombreDe(u)}</option>)}
            </select>
            <button onClick={agregar} disabled={!colaboradorNuevo} className="btn disabled:opacity-50 shrink-0">Agregar</button>
          </div>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Interacciones de esta oportunidad</h4>
        <form onSubmit={handleSubmit(onCrearInteraccion)} className="space-y-2 mb-3">
          <div className="flex gap-2">
            <select className="border border-gray-300 rounded-md p-2 text-sm" {...register('tipo')}>
              <option value="Llamada">Llamada</option>
              <option value="Correo">Correo</option>
              <option value="Reunión">Reunión</option>
              <option value="Nota">Nota</option>
            </select>
            <input type="text" placeholder="Detalle *" className={`flex-1 ${claseInput(errors.detalle)}`}
              {...register('detalle', { required: 'El detalle no puede estar vacío' })} />
          </div>
          <ErrorMessage>{errors.detalle?.message}</ErrorMessage>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-md transition">
            + Registrar interacción
          </button>
        </form>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {interacciones.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Sin interacciones registradas.</p>
          ) : interacciones.map((i) => (
            <div key={i.id} className="p-3 bg-gray-50 rounded-md border border-gray-100 text-xs">
              <div className="flex justify-between">
                <span className="font-bold uppercase text-[10px] text-blue-700">{i.tipo}</span>
                <span className="text-[10px] text-gray-400">{new Date(i.created_at).toLocaleDateString('es-MX')}</span>
              </div>
              <p className="text-gray-700 font-medium">{i.detalle}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Historial de reasignaciones</h4>
        {cargandoHistorial ? (
          <p className="text-xs text-gray-400">Cargando historial…</p>
        ) : errorHistorial ? (
          <p role="alert" className="text-xs text-red-600">{errorHistorial}</p>
        ) : historial.length === 0 ? (
          <p className="text-xs text-gray-400">Sin reasignaciones.</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {historial.map((h) => (
              <li key={h.id} className="p-3 bg-gray-50 rounded-md border border-gray-100 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-gray-700">
                    {h.responsable_anterior?.full_name || 'Sin responsable'} → {h.responsable_nuevo?.full_name || 'Usuario eliminado'}
                  </span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{new Date(h.created_at).toLocaleString('es-MX')}</span>
                </div>
                <p className="text-gray-500">Reasignó: {h.reasignado_por_usuario?.full_name || 'Usuario eliminado'}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- Página ----------
export default function Oportunidades() {
  const { contactos } = useCRM();
  const { oportunidades, filtros, setFiltros, cargando, error, actualizar, recargar } = useOportunidades();
  const { responsables, error: errorResponsables, cargando: cargandoResponsables } = useResponsablesFiltro();
  const [seleccionada, setSeleccionada] = useState(null);

  const cambiarEtapa = async (id, etapa) => {
    try {
      await actualizar(id, { etapa });
    } catch (err) {
      alert(mensajeDelServidor(err, 'No se pudo cambiar la etapa'));
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Deseas eliminar esta oportunidad?')) return;
    try {
      await eliminarOportunidad(id);
      await recargar();
      if (seleccionada === id) setSeleccionada(null);
    } catch (err) {
      alert(mensajeDelServidor(err, 'Error al eliminar la oportunidad'));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Oportunidades</h1>
          <p className="text-sm text-gray-500">Posibles ventas con tus contactos, desde el primer contacto hasta que se ganan o se pierden.</p>
        </div>
        <Link to="/app/pipeline" className="btn shrink-0">Ver pipeline</Link>
      </div>

      <FormularioOportunidad contactos={contactos} onCreada={recargar} />

      <FiltrosListado cargando={cargando} onAplicar={(valores) => { setSeleccionada(null); setFiltros(valores); }} campos={[
        { nombre: 'q', etiqueta: 'Buscar oportunidad', placeholder: 'Nombre de la oportunidad' },
        { nombre: 'etapa', etiqueta: 'Etapa', opciones: [{ valor: '', etiqueta: 'Todas las etapas' }, ...ETAPAS.map((etapa) => ({ valor: etapa.valor, etiqueta: etapa.valor }))] },
        { nombre: 'responsable_id', etiqueta: 'Responsable', deshabilitado: cargandoResponsables || Boolean(errorResponsables), opciones: [
          { valor: '', etiqueta: cargandoResponsables ? 'Cargando responsables...' : 'Todos los responsables' },
          ...responsables.map((usuario) => ({ valor: usuario.id, etiqueta: usuario.nombre || usuario.email || 'Sin nombre' }))
        ] },
        { nombre: 'monto_min', etiqueta: 'Monto mínimo', tipo: 'number', placeholder: 'Desde' },
        { nombre: 'monto_max', etiqueta: 'Monto máximo', tipo: 'number', placeholder: 'Hasta' }
      ]} />
      {errorResponsables && <p role="alert" className="text-sm text-red-700">{errorResponsables}</p>}

      {error && <div role="alert" className="p-3 rounded-md text-sm bg-red-100 text-red-800">
        <p>{error}</p><button type="button" className="btn mt-2" onClick={recargar}>Reintentar</button>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${seleccionada ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b">
                <tr>
                  <th className="px-4 py-3">Oportunidad</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Cierre</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cargando ? (
                  <tr><td colSpan="7" className="text-center py-6 text-gray-400">Cargando oportunidades…</td></tr>
                ) : error ? null : oportunidades.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-6 text-gray-500">{Object.keys(filtros).length ? 'No se encontraron resultados con los filtros seleccionados.' : 'No hay oportunidades registradas.'}</td></tr>
                ) : oportunidades.map((o) => (
                  <tr key={o.id} className={`hover:bg-gray-50 transition ${seleccionada === o.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{o.nombre_oportunidad}</td>
                    <td className="px-4 py-3">{o.contactos ? `${o.contactos.nombre} ${o.contactos.apellido ?? ''}` : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 whitespace-nowrap">{formatoMonto(o.valor_estimado)}</td>
                    <td className="px-4 py-3">
                      <select aria-label={`Etapa de ${o.nombre_oportunidad}`} value={o.etapa} onChange={(e) => cambiarEtapa(o.id, e.target.value)}
                        className={`rounded-full px-2 py-1 text-xs font-semibold border-0 ${claseEtapa(o.etapa)}`}>
                        {ETAPAS.map((e) => <option key={e.valor} value={e.valor}>{e.valor}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">{nombreDe(o.responsable)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatoFecha(o.fecha_cierre_prevista)}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => setSeleccionada(o.id)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1 rounded-md text-xs font-semibold transition">
                        Detalle
                      </button>
                      <button onClick={() => handleEliminar(o.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-md text-xs font-semibold transition">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {seleccionada && (
          <DetalleOportunidad key={seleccionada} id={seleccionada} onCerrar={() => setSeleccionada(null)} onReasignada={recargar} />
        )}
      </div>
    </div>
  );
}
