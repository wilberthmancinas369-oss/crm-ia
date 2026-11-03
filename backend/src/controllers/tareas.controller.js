import { tareasService } from '../services/tareas.service.js';
import { ambitoDe, buscarContactoVisible, buscarOportunidadVisible, esAsignableEnGrupo } from '../services/alcance.service.js';
import { gruposConPermiso, puedeEnGrupo } from '../config/permisos.js';
import { avisarSiVencePronto } from '../services/recordatorios.service.js';

export const getMisTareas = async (req, res) => {
  try {
    res.json(await tareasService.getMisTareas(req.user.id, ambitoDe(req), req.filtros));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// HU-13: el Jefe de Área ve las tareas de los grupos donde puede asignar responsables;
// el Administrador, las de toda la empresa.
export const getTareasEquipo = async (req, res) => {
  try {
    const alcance = gruposConPermiso(req.perfil, 'asignarResponsable');
    if (alcance !== null && !alcance.length) {
      return res.status(403).json({ error: 'Solo el Jefe de Área o el Administrador ven las tareas del equipo' });
    }
    res.json(await tareasService.getTareasEquipo({ companyId: req.company_id, alcance }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Tarea de la URL que el usuario puede modificar: la suya, o cualquiera del grupo si es su
 * Jefe de Área (o Administrador). Un Agente no toca tareas ajenas (HU-13).
 * Devuelve { tarea } o { status, error }.
 */
async function tareaModificable(req, ambito) {
  const tarea = await tareasService.getById(req.params.id, ambito);
  if (!tarea) return { status: 404, error: 'Tarea no encontrada' };
  if (tarea.responsable_id !== req.perfil.usuario.id
    && !puedeEnGrupo(req.perfil, 'asignarResponsable', tarea.group_id)) {
    return { status: 403, error: 'Solo puedes modificar tus propias tareas' };
  }
  return { tarea };
}

const camposTarea = (body) => {
  const datos = {};
  for (const campo of ['titulo', 'fecha_limite', 'estado', 'responsable_id', 'contacto_id', 'oportunidad_id']) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
  }
  return datos;
};

// La tarea toma el grupo de su vínculo. Igual que en las oportunidades (HU 4.1), el responsable debe
// ser del grupo (o administrador) para que la vea en "Mis tareas", y asignarla a otra persona
// requiere asignarResponsable (Jefe de Área del grupo o Administrador).
async function validarRelaciones(req, tarea, ambito, responsableActual) {
  if (Boolean(tarea.contacto_id) === Boolean(tarea.oportunidad_id)) {
    return { status: 400, error: 'La tarea debe estar ligada a un contacto o una oportunidad, solo uno' };
  }
  const vinculo = tarea.contacto_id
    ? await buscarContactoVisible(tarea.contacto_id, ambito)
    : await buscarOportunidadVisible(tarea.oportunidad_id, ambito);
  if (!vinculo) return { status: 404, error: 'Contacto u oportunidad no encontrado' };
  if (!(await tareasService.responsableExiste(tarea.responsable_id, ambito))) {
    return { status: 400, error: 'El responsable debe pertenecer a tu empresa' };
  }
  const asignaAOtro = tarea.responsable_id !== req.perfil.usuario.id && tarea.responsable_id !== responsableActual;
  if (asignaAOtro && !puedeEnGrupo(req.perfil, 'asignarResponsable', vinculo.group_id)) {
    return { status: 403, error: 'Solo el Jefe de Área o el Administrador pueden asignar tareas a otra persona' };
  }
  if (!(await esAsignableEnGrupo(tarea.responsable_id, vinculo.group_id, ambito.companyId))) {
    return { status: 400, error: 'El responsable debe pertenecer al grupo del contacto u oportunidad' };
  }
  return null;
}

export const createTarea = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const datos = camposTarea(req.body);
    const invalido = await validarRelaciones(req, datos, ambito);
    if (invalido) return res.status(invalido.status).json({ error: invalido.error });
    const tarea = await tareasService.create({ estado: 'Pendiente', ...datos }, ambito);
    res.status(201).json(tarea);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTarea = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const { tarea: actual, status, error } = await tareaModificable(req, ambito);
    if (!actual) return res.status(status).json({ error });
    const datos = camposTarea(req.body);
    if (!Object.keys(datos).length) return res.status(400).json({ error: 'Indica al menos un campo de la tarea' });
    const invalido = await validarRelaciones(req, { ...actual, ...datos }, ambito, actual.responsable_id);
    if (invalido) return res.status(invalido.status).json({ error: invalido.error });
    const reiniciaRecordatorio = (datos.fecha_limite !== undefined && new Date(datos.fecha_limite).getTime() !== new Date(actual.fecha_limite).getTime())
      || (datos.responsable_id !== undefined && datos.responsable_id !== actual.responsable_id);
    if (reiniciaRecordatorio) datos.recordatorio_enviado_at = null;
    const tarea = await tareasService.update(req.params.id, datos, ambito);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    if (reiniciaRecordatorio) await avisarSiVencePronto(tarea.id);
    res.json(tarea);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// HU-13: asigna o reasigna la tarea a un miembro del grupo de su vínculo (o a un administrador).
// El recordatorio de 24 h se reinicia para que le llegue al nuevo responsable.
export const asignarTarea = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const actual = await tareasService.getById(req.params.id, ambito);
    if (!actual) return res.status(404).json({ error: 'Tarea no encontrada' });
    if (!puedeEnGrupo(req.perfil, 'asignarResponsable', actual.group_id)) {
      return res.status(403).json({ error: 'Solo el Jefe de Área del grupo o el Administrador pueden asignar tareas' });
    }
    const { responsable_id } = req.body;
    if (responsable_id === actual.responsable_id) return res.json(actual);
    if (!(await esAsignableEnGrupo(responsable_id, actual.group_id, ambito.companyId))) {
      return res.status(400).json({ error: 'El responsable debe pertenecer al grupo de la tarea' });
    }
    const tarea = await tareasService.update(req.params.id, { responsable_id, recordatorio_enviado_at: null }, ambito);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    await avisarSiVencePronto(tarea.id);
    res.json(tarea);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTarea = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const { tarea: actual, status, error } = await tareaModificable(req, ambito);
    if (!actual) return res.status(status).json({ error });
    if (!(await tareasService.remove(req.params.id, ambito))) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const completarTarea = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const { tarea: actual, status, error } = await tareaModificable(req, ambito);
    if (!actual) return res.status(status).json({ error });
    const tarea = await tareasService.update(req.params.id, { estado: 'Completada' }, ambito);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(tarea);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
