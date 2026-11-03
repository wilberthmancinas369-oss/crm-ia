import { useEffect, useMemo, useState } from 'react';
import { listarTareasEquipo, asignarTarea, actualizarTarea, eliminarTarea } from '../services/tareas';
import { listarAsignables } from '../services/grupos';
import { useGruposPermitidos } from '../hooks/useGruposPermitidos';

// HU-13: el Jefe de Área ve las tareas de los miembros de su grupo y puede asignarlas,
// editarlas o eliminarlas. El Administrador ve las de toda la empresa. El backend valida cada acción.

const claseInput = 'w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]';
const mensajeError = (error, defecto) =>
  error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || defecto;
const colorEstado = {
  Pendiente: 'bg-amber-100 text-amber-800',
  'En progreso': 'bg-blue-100 text-blue-800',
  Completada: 'bg-green-100 text-green-800'
};
const ESTADOS = ['Pendiente', 'En progreso', 'Completada'];
const nombreDe = (usuario) => usuario?.nombre || usuario?.email || 'Sin nombre';
const fechaLegible = (fecha) => new Date(fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
// <input type="datetime-local"> trabaja en hora local sin zona: "2026-11-02T15:30"
const aFechaLocal = (fecha) => {
  const d = new Date(fecha);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const vinculoDe = (tarea) => (tarea.contacto_id
  ? `Contacto: ${tarea.contactos?.nombre || ''} ${tarea.contactos?.apellido || ''}`.trim()
  : `Oportunidad: ${tarea.oportunidades?.nombre_oportunidad || ''}`);

export default function TareasEquipo() {
  const grupos = useGruposPermitidos('asignarResponsable');
  const [tareas, setTareas] = useState([]);
  const [asignables, setAsignables] = useState({}); // { grupoId: [{ id, nombre, email }] }
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [intento, setIntento] = useState(0);
  const [procesando, setProcesando] = useState(null); // id de la tarea que se está guardando
  const [editando, setEditando] = useState(null); // { id, titulo, fecha_limite, estado }
  const [filtros, setFiltros] = useState({ grupo: '', responsable: '', estado: 'activas' });

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setErrorCarga('');
    listarTareasEquipo()
      .then((lista) => { if (!cancelado) setTareas(lista); })
      .catch((error) => { if (!cancelado) setErrorCarga(mensajeError(error, 'No se pudieron cargar las tareas del equipo.')); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [intento]);

  // Miembros a los que se puede asignar, por cada grupo con tareas (miembros del grupo + administradores)
  const gruposConTareas = useMemo(() => [...new Set(tareas.map((t) => t.group_id))], [tareas]);
  useEffect(() => {
    const faltantes = gruposConTareas.filter((id) => !(id in asignables));
    if (!faltantes.length) return;
    Promise.all(faltantes.map((id) => listarAsignables(id).then((lista) => [id, lista]).catch(() => [id, []])))
      .then((pares) => setAsignables((actuales) => ({ ...actuales, ...Object.fromEntries(pares) })));
  }, [gruposConTareas, asignables]);

  const nombreGrupo = (id) => grupos.find((g) => g.id === id)?.nombre || 'Grupo';
  const responsables = useMemo(() => {
    const mapa = new Map(tareas.map((t) => [t.responsable.id, t.responsable]));
    return [...mapa.values()].sort((a, b) => nombreDe(a).localeCompare(nombreDe(b)));
  }, [tareas]);

  const visibles = tareas.filter((t) =>
    (!filtros.grupo || t.group_id === filtros.grupo)
    && (!filtros.responsable || t.responsable.id === filtros.responsable)
    && (filtros.estado === 'todas' || (filtros.estado === 'activas' ? t.estado !== 'Completada' : t.estado === filtros.estado)));

  // Ejecuta una acción sobre la tarea y reemplaza la fila conservando vínculo, grupo y responsable
  const guardar = async (tarea, accion, cambios, textoExito, textoError) => {
    setMensaje(null);
    setProcesando(tarea.id);
    try {
      const actualizada = await accion();
      setTareas((actuales) => actuales.map((t) => (t.id === tarea.id
        ? { ...t, ...actualizada, ...cambios(actualizada) }
        : t)));
      setMensaje({ tipo: 'exito', texto: textoExito });
      return true;
    } catch (error) {
      setMensaje({ tipo: 'error', texto: mensajeError(error, textoError) });
      return false;
    } finally {
      setProcesando(null);
    }
  };

  const reasignar = (tarea, responsableId) => {
    const destino = (asignables[tarea.group_id] || []).find((u) => u.id === responsableId);
    if (!destino) return;
    if (!window.confirm(`¿Reasignar "${tarea.titulo}" de ${nombreDe(tarea.responsable)} a ${nombreDe(destino)}?\n\nSi vence en menos de 24 h, el recordatorio se enviará al nuevo responsable.`)) return;
    guardar(tarea, () => asignarTarea(tarea.id, responsableId), () => ({ responsable: destino }),
      `Tarea asignada a ${nombreDe(destino)}.`, 'No se pudo reasignar la tarea.');
  };

  const guardarEdicion = async (tarea) => {
    if (!editando.titulo.trim()) return setMensaje({ tipo: 'error', texto: 'El título es obligatorio.' });
    const fecha = new Date(editando.fecha_limite);
    if (Number.isNaN(fecha.getTime())) return setMensaje({ tipo: 'error', texto: 'Ingresa una fecha válida.' });
    const ok = await guardar(tarea, () => actualizarTarea(tarea.id, {
      titulo: editando.titulo.trim(), fecha_limite: fecha.toISOString(), estado: editando.estado
    }), () => ({}), 'Tarea actualizada.', 'No se pudo actualizar la tarea.');
    if (ok) setEditando(null);
  };

  const eliminar = async (tarea) => {
    if (!window.confirm(`¿Eliminar la tarea "${tarea.titulo}" de ${nombreDe(tarea.responsable)}?\n\nEsta acción no se puede deshacer.`)) return;
    setMensaje(null);
    setProcesando(tarea.id);
    try {
      await eliminarTarea(tarea.id);
      setTareas((actuales) => actuales.filter((t) => t.id !== tarea.id));
      setMensaje({ tipo: 'exito', texto: 'Tarea eliminada.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: mensajeError(error, 'No se pudo eliminar la tarea.') });
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Tareas del equipo</h1>
        <p className="text-sm text-gray-500 mt-1">Consulta las tareas de los miembros de tu grupo, asígnalas a otra persona, edítalas o elimínalas.</p>
      </div>

      {cargando ? <p role="status" className="text-sm text-gray-500">Cargando tareas...</p> : errorCarga ? (
        <div role="alert" className="bg-red-100 text-red-800 p-4 rounded-lg space-y-3">
          <p>{errorCarga}</p>
          <button type="button" className="btn" onClick={() => setIntento((valor) => valor + 1)}>Reintentar</button>
        </div>
      ) : (
        <>
          <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Filtros">
            {grupos.length > 1 && (
              <select aria-label="Filtrar por grupo" className={claseInput} value={filtros.grupo}
                onChange={(e) => setFiltros({ ...filtros, grupo: e.target.value })}>
                <option value="">Todos los grupos</option>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            )}
            <select aria-label="Filtrar por responsable" className={claseInput} value={filtros.responsable}
              onChange={(e) => setFiltros({ ...filtros, responsable: e.target.value })}>
              <option value="">Todos los responsables</option>
              {responsables.map((r) => <option key={r.id} value={r.id}>{nombreDe(r)}</option>)}
            </select>
            <select aria-label="Filtrar por estado" className={claseInput} value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
              <option value="activas">Sin completar</option>
              <option value="todas">Todas</option>
              {ESTADOS.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
            </select>
          </section>

          {mensaje && <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={`p-3 rounded-md text-sm ${mensaje.tipo === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{mensaje.texto}</p>}

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" aria-labelledby="lista-equipo">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 id="lista-equipo" className="font-semibold text-gray-700">Tareas</h2>
              <span className="text-sm text-gray-500">{visibles.length} de {tareas.length}</span>
            </div>
            {!visibles.length ? <p className="text-sm text-gray-500 text-center p-6">
              {tareas.length ? 'Ninguna tarea coincide con los filtros.' : 'Tu equipo aún no tiene tareas.'}
            </p> : (
              <ul className="divide-y divide-gray-100">
                {visibles.map((tarea) => {
                  const ocupada = procesando === tarea.id;
                  const enEdicion = editando?.id === tarea.id;
                  const candidatos = (asignables[tarea.group_id] || []).filter((u) => u.id !== tarea.responsable.id);
                  return (
                    <li key={tarea.id} className="p-4 space-y-3">
                      {enEdicion ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input aria-label="Título" className={claseInput} value={editando.titulo}
                            onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} />
                          <input aria-label="Fecha y hora límite" type="datetime-local" className={claseInput} value={editando.fecha_limite}
                            onChange={(e) => setEditando({ ...editando, fecha_limite: e.target.value })} />
                          <select aria-label="Estado" className={claseInput} value={editando.estado}
                            onChange={(e) => setEditando({ ...editando, estado: e.target.value })}>
                            {ESTADOS.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <h3 className="font-medium text-gray-800 break-words">{tarea.titulo}</h3>
                            <p className="text-sm text-gray-600 break-words">{vinculoDe(tarea)}</p>
                            <p className="text-sm text-gray-500">
                              Responsable: <strong>{nombreDe(tarea.responsable)}</strong>
                              {grupos.length > 1 && <> · {nombreGrupo(tarea.group_id)}</>}
                            </p>
                            <p className="text-sm text-gray-500">Fecha límite: <time dateTime={tarea.fecha_limite}>{fechaLegible(tarea.fecha_limite)}</time></p>
                          </div>
                          <span className={`self-start px-2 py-1 rounded-full text-xs font-medium ${colorEstado[tarea.estado] || 'bg-gray-100 text-gray-700'}`}>{tarea.estado}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {enEdicion ? (
                          <>
                            <button type="button" className="btn text-xs disabled:opacity-60" disabled={ocupada} onClick={() => guardarEdicion(tarea)}>
                              {ocupada ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button type="button" className="text-xs px-3 py-1 rounded-md border border-gray-300 text-gray-700" disabled={ocupada} onClick={() => setEditando(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <select aria-label={`Asignar ${tarea.titulo}`} className="border border-gray-300 rounded-md p-1 text-xs"
                              value="" disabled={ocupada || !candidatos.length}
                              onChange={(e) => reasignar(tarea, e.target.value)}>
                              <option value="">{candidatos.length ? 'Asignar a...' : 'Sin otros miembros'}</option>
                              {candidatos.map((u) => <option key={u.id} value={u.id}>{nombreDe(u)}</option>)}
                            </select>
                            <button type="button" className="text-xs px-3 py-1 rounded-md border border-gray-300 text-gray-700 disabled:opacity-60" disabled={ocupada}
                              onClick={() => setEditando({ id: tarea.id, titulo: tarea.titulo, fecha_limite: aFechaLocal(tarea.fecha_limite), estado: tarea.estado })}>
                              Editar
                            </button>
                            <button type="button" className="text-xs px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60" disabled={ocupada}
                              onClick={() => eliminar(tarea)}>
                              {ocupada ? 'Procesando...' : 'Eliminar'}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
