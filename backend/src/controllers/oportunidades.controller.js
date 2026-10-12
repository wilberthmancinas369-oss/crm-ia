import { oportunidadesService } from '../services/oportunidades.service.js';
import { ambitoDe, buscarContactoVisible, resolverGrupoDestino } from '../services/alcance.service.js';

// La empresa y los grupos permitidos salen de la sesión (middleware autorizar), nunca del body ni del query.
// Una oportunidad fuera del alcance responde 404, igual que una inexistente (HU-11).

// Toma solo las columnas de la tabla oportunidades; un valor vacío del formulario se guarda como null
const camposOportunidad = (body) => {
  const campos = {};
  for (const clave of ['nombre_oportunidad', 'contacto_id', 'valor_estimado', 'etapa', 'probabilidad', 'fecha_cierre_prevista']) {
    if (body[clave] !== undefined) campos[clave] = body[clave] === '' ? null : body[clave];
  }
  return campos;
};

export const getOportunidades = async (req, res) => {
  try {
    const oportunidades = await oportunidadesService.getAll(ambitoDe(req));
    res.json(oportunidades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOportunidadById = async (req, res) => {
  try {
    const oportunidad = await oportunidadesService.getById(req.params.id, ambitoDe(req));
    if (!oportunidad) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' });
    }
    res.json(oportunidad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createOportunidad = async (req, res) => {
  try {
    const campos = camposOportunidad(req.body);
    let grupoId;

    if (campos.contacto_id) {
      // Ligada a un contacto: toma el grupo del contacto, que debe estar en su alcance
      const contacto = await buscarContactoVisible(campos.contacto_id, ambitoDe(req));
      if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado' });
      grupoId = contacto.group_id;
    } else {
      const destino = await resolverGrupoDestino(req, req.body.grupo_id);
      if (destino.error) return res.status(destino.status).json({ error: destino.error });
      grupoId = destino.grupoId;
    }

    const nuevaOportunidad = await oportunidadesService.create(campos, ambitoDe(req), grupoId);
    res.status(201).json(nuevaOportunidad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOportunidad = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const actual = await oportunidadesService.getById(req.params.id, ambito);
    if (!actual) return res.status(404).json({ message: 'Oportunidad no encontrada' });

    const campos = camposOportunidad(req.body);
    if (campos.contacto_id) {
      // Cambiar de grupo una oportunidad es reasignarla (otra HU); el contacto nuevo debe ser del mismo grupo
      const contacto = await buscarContactoVisible(campos.contacto_id, ambito);
      if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado' });
      if (contacto.group_id !== actual.group_id) {
        return res.status(400).json({ error: 'El contacto debe pertenecer al mismo grupo que la oportunidad' });
      }
    }

    const actualizada = await oportunidadesService.update(req.params.id, ambito, campos);
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOportunidad = async (req, res) => {
  try {
    const eliminada = await oportunidadesService.delete(req.params.id, ambitoDe(req));
    if (!eliminada) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' });
    }
    res.json({ message: 'Oportunidad eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
