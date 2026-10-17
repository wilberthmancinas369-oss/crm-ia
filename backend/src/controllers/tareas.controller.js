import { tareasService } from '../services/tareas.service.js';
import { ambitoDe, buscarContactoVisible, buscarOportunidadVisible } from '../services/alcance.service.js';

export const getMisTareas = async (req, res) => {
  try {
    res.json(await tareasService.getMisTareas(req.user.id, ambitoDe(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const camposTarea = (body) => {
  const datos = {};
  for (const campo of ['titulo', 'fecha_limite', 'estado', 'responsable_id', 'contacto_id', 'oportunidad_id']) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
  }
  return datos;
};

async function validarRelaciones(tarea, ambito) {
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
  return null;
}

export const createTarea = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const datos = camposTarea(req.body);
    const invalido = await validarRelaciones(datos, ambito);
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
    const actual = await tareasService.getById(req.params.id, ambito);
    if (!actual) return res.status(404).json({ error: 'Tarea no encontrada' });
    const datos = camposTarea(req.body);
    if (!Object.keys(datos).length) return res.status(400).json({ error: 'Indica al menos un campo de la tarea' });
    const invalido = await validarRelaciones({ ...actual, ...datos }, ambito);
    if (invalido) return res.status(invalido.status).json({ error: invalido.error });
    if ((datos.fecha_limite !== undefined && new Date(datos.fecha_limite).getTime() !== new Date(actual.fecha_limite).getTime())
      || (datos.responsable_id !== undefined && datos.responsable_id !== actual.responsable_id)) {
      datos.recordatorio_enviado_at = null;
    }
    const tarea = await tareasService.update(req.params.id, datos, ambito);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(tarea);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const completarTarea = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const actual = await tareasService.getById(req.params.id, ambito);
    if (!actual) return res.status(404).json({ error: 'Tarea no encontrada' });
    const tarea = await tareasService.update(req.params.id, { estado: 'Completada' }, ambito);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(tarea);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
