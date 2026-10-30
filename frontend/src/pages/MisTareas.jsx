import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { listarMisTareas, crearTarea, actualizarTarea, completarTarea } from '../services/tareas';
import { listarContactos } from '../services/contactos';
import { listarOportunidades } from '../services/oportunidades';
import ErrorMessage from '../components/ErrorMessage';
import FiltrosListado from '../components/FiltrosListado';
import { useListadoFiltrado } from '../hooks/useListadoFiltrado';
import { useResponsablesFiltro } from '../hooks/useResponsablesFiltro';

const claseInput = 'w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]';
const mensajeError = (error, defecto) =>
  error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || defecto;
const colorEstado = {
  Pendiente: 'bg-amber-100 text-amber-800',
  'En progreso': 'bg-blue-100 text-blue-800',
  Completada: 'bg-green-100 text-green-800'
};

export default function MisTareas() {
  const { perfil } = useAuth();
  const { datos: tareas, filtros, setFiltros, cargando: cargandoLista, error: errorLista, recargar } = useListadoFiltrado(listarMisTareas);
  const { responsables, error: errorResponsables, cargando: cargandoResponsables } = useResponsablesFiltro();
  const [contactos, setContactos] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [intento, setIntento] = useState(0);
  const [procesando, setProcesando] = useState(null); // id de la tarea que se está guardando
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { titulo: '', fecha_limite: '', tipoVinculo: 'contacto', vinculo_id: '' }
  });
  const tipoVinculo = watch('tipoVinculo');

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setErrorCarga('');
    Promise.all([listarContactos(), listarOportunidades()])
      .then(([listaContactos, listaOportunidades]) => {
        if (cancelado) return;
        setContactos(listaContactos);
        setOportunidades(listaOportunidades);
      })
      .catch((error) => {
        if (!cancelado) setErrorCarga(mensajeError(error, 'No se pudieron cargar las tareas y sus vínculos.'));
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [perfil.usuario.id, intento]);

  const onCrear = async ({ titulo, fecha_limite, tipoVinculo, vinculo_id }) => {
    setMensaje(null);
    try {
      await crearTarea({
        titulo: titulo.trim(),
        fecha_limite: new Date(fecha_limite).toISOString(),
        responsable_id: perfil.usuario.id,
        [tipoVinculo === 'contacto' ? 'contacto_id' : 'oportunidad_id']: vinculo_id
      });
      await recargar();
      reset();
      setMensaje({ tipo: 'exito', texto: 'Tarea creada correctamente.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: mensajeError(error, 'No se pudo crear la tarea. Inténtalo de nuevo.') });
    }
  };

  // Recarga con los filtros activos: una tarea completada puede dejar de coincidir.
  const guardarCambio = async (tarea, accion, textoError) => {
    setMensaje(null);
    setProcesando(tarea.id);
    try {
      await accion();
      await recargar();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: mensajeError(error, textoError) });
    } finally {
      setProcesando(null);
    }
  };

  const cambiarEstado = (tarea, estado) =>
    guardarCambio(tarea, () => actualizarTarea(tarea.id, { estado }), 'No se pudo cambiar el estado de la tarea.');
  const completar = (tarea) =>
    guardarCambio(tarea, () => completarTarea(tarea.id), 'No se pudo completar la tarea.');

  const vinculos = tipoVinculo === 'contacto' ? contactos : oportunidades;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Mis tareas</h1>
        <p className="text-sm text-gray-500 mt-1">Consulta, crea y completa tareas.</p>
      </div>

      {cargando ? <p role="status" className="text-sm text-gray-500">Cargando tareas...</p> : errorCarga ? (
        <div role="alert" className="bg-red-100 text-red-800 p-4 rounded-lg space-y-3">
          <p>{errorCarga}</p>
          <button type="button" className="btn" onClick={() => setIntento((valor) => valor + 1)}>Reintentar</button>
        </div>
      ) : (
        <>
          <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200" aria-labelledby="nueva-tarea">
            <h2 id="nueva-tarea" className="text-lg font-semibold text-gray-700 mb-4">Nueva tarea</h2>
            <form onSubmit={handleSubmit(onCrear)} noValidate className="space-y-4">
              <fieldset disabled={isSubmitting} className="grid grid-cols-1 md:grid-cols-2 gap-4 disabled:opacity-60">
                <div>
                  <label htmlFor="titulo" className="block text-sm text-gray-600 mb-1">Título *</label>
                  <input id="titulo" className={claseInput} aria-invalid={Boolean(errors.titulo)} {...register('titulo', {
                    validate: (valor) => Boolean(valor.trim()) || 'El título es obligatorio'
                  })} />
                  <ErrorMessage>{errors.titulo?.message}</ErrorMessage>
                </div>
                <div>
                  <label htmlFor="fecha_limite" className="block text-sm text-gray-600 mb-1">Fecha y hora límite *</label>
                  <input id="fecha_limite" type="datetime-local" className={claseInput} aria-invalid={Boolean(errors.fecha_limite)} {...register('fecha_limite', {
                    required: 'La fecha límite es obligatoria',
                    validate: (valor) => !Number.isNaN(new Date(valor).getTime()) || 'Ingresa una fecha válida'
                  })} />
                  <ErrorMessage>{errors.fecha_limite?.message}</ErrorMessage>
                </div>
                <div>
                  <label htmlFor="tipoVinculo" className="block text-sm text-gray-600 mb-1">Ligar a</label>
                  <select id="tipoVinculo" className={claseInput} {...register('tipoVinculo', {
                    onChange: () => setValue('vinculo_id', '', { shouldValidate: false })
                  })}>
                    <option value="contacto">Contacto</option>
                    <option value="oportunidad">Oportunidad</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="vinculo_id" className="block text-sm text-gray-600 mb-1">{tipoVinculo === 'contacto' ? 'Contacto' : 'Oportunidad'} *</label>
                  <select id="vinculo_id" className={claseInput} aria-invalid={Boolean(errors.vinculo_id)} {...register('vinculo_id', { required: 'Selecciona un contacto o una oportunidad' })}>
                    <option value="">Selecciona una opción</option>
                    {vinculos.map((vinculo) => <option key={vinculo.id} value={vinculo.id}>
                      {tipoVinculo === 'contacto' ? `${vinculo.nombre} ${vinculo.apellido || ''}`.trim() : vinculo.nombre_oportunidad}
                    </option>)}
                  </select>
                  <ErrorMessage>{errors.vinculo_id?.message}</ErrorMessage>
                  {!vinculos.length && <p className="text-sm text-gray-500 mt-1">No hay {tipoVinculo === 'contacto' ? 'contactos' : 'oportunidades'} disponibles. Registra uno en su apartado para poder vincular la tarea.</p>}
                </div>
              </fieldset>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button type="submit" className="btn disabled:opacity-60" disabled={isSubmitting || !vinculos.length}>
                  {isSubmitting ? 'Guardando...' : 'Guardar tarea'}
                </button>
              </div>
            </form>
            {mensaje && <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={`mt-4 p-3 rounded-md text-sm ${mensaje.tipo === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{mensaje.texto}</p>}
          </section>

          <FiltrosListado cargando={cargandoLista} onAplicar={setFiltros} campos={[
            { nombre: 'q', etiqueta: 'Buscar tarea', placeholder: 'Título de la tarea' },
            { nombre: 'estado', etiqueta: 'Estado', opciones: [
              { valor: '', etiqueta: 'Todos los estados' }, ...Object.keys(colorEstado).map((estado) => ({ valor: estado, etiqueta: estado }))
            ] },
            { nombre: 'vencimiento', etiqueta: 'Vencimiento', opciones: [
              { valor: '', etiqueta: 'Cualquier vencimiento' }, { valor: 'vencidas', etiqueta: 'Vencidas' },
              { valor: 'proximas_24h', etiqueta: 'Próximas 24 horas' }, { valor: 'sin_vencer', etiqueta: 'Sin vencer' }
            ] },
            { nombre: 'responsable_id', etiqueta: 'Responsable', deshabilitado: cargandoResponsables || Boolean(errorResponsables), opciones: [
              { valor: '', etiqueta: 'Mis tareas' }, { valor: 'todos', etiqueta: 'Todos los responsables' },
              ...responsables.filter((usuario) => usuario.id !== perfil.usuario.id).map((usuario) => ({ valor: usuario.id, etiqueta: usuario.nombre || usuario.email || 'Sin nombre' }))
            ] }
          ]} />
          {errorResponsables && <p role="alert" className="text-sm text-red-700">{errorResponsables}</p>}
          {errorLista && <div role="alert" className="bg-red-100 text-red-800 p-3 rounded-md text-sm">
            <p>{errorLista}</p><button type="button" className="btn mt-2" onClick={recargar}>Reintentar</button>
          </div>}

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" aria-labelledby="lista-tareas">
            <div className="p-4 border-b border-gray-100">
              <h2 id="lista-tareas" className="font-semibold text-gray-700">{filtros.responsable_id ? 'Tareas encontradas' : 'Mis tareas'}</h2>
            </div>
            {cargandoLista ? <p role="status" className="text-sm text-gray-500 p-6">Cargando tareas...</p> : errorLista ? null : !tareas.length ? <p className="text-sm text-gray-500 text-center p-6">{Object.keys(filtros).length ? 'No se encontraron resultados con los filtros seleccionados.' : 'Aún no tienes tareas asignadas.'}</p> : (
              <ul className="divide-y divide-gray-100">
                {tareas.map((tarea) => (
                  <li key={tarea.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-medium text-gray-800 break-words">{tarea.titulo}</h3>
                      <p className="text-sm text-gray-600 break-words">{tarea.contacto_id
                        ? `Contacto: ${tarea.contactos?.nombre || ''} ${tarea.contactos?.apellido || ''}`.trim()
                        : `Oportunidad: ${tarea.oportunidades?.nombre_oportunidad || ''}`}</p>
                      <p className="text-sm text-gray-500">Fecha límite: <time dateTime={tarea.fecha_limite}>{new Date(tarea.fecha_limite).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</time></p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorEstado[tarea.estado] || 'bg-gray-100 text-gray-700'}`}>{tarea.estado}</span>
                      {tarea.estado !== 'Completada' && (
                        <>
                          <select aria-label={`Estado de ${tarea.titulo}`} className="border border-gray-300 rounded-md p-1 text-xs"
                            value={tarea.estado} disabled={procesando === tarea.id}
                            onChange={(e) => cambiarEstado(tarea, e.target.value)}>
                            <option value="Pendiente">Pendiente</option>
                            <option value="En progreso">En progreso</option>
                          </select>
                          <button type="button" className="btn text-xs disabled:opacity-60" disabled={procesando === tarea.id}
                            onClick={() => completar(tarea)}>
                            {procesando === tarea.id ? 'Guardando...' : 'Completar'}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
