import { interaccionesService } from '../services/interacciones.service.js';
import { ambitoDe, buscarContactoVisible, buscarOportunidadVisible } from '../services/alcance.service.js';

// Las interacciones heredan el grupo de su contacto. Fuera del alcance responden 404 (HU-11).

// Valida que el contacto (y la oportunidad, si viene) estén en el alcance y en el mismo grupo.
// Devuelve null si todo está bien, o { status, error }.
async function validarVinculos({ contacto_id, oportunidad_id }, ambito) {
  const contacto = await buscarContactoVisible(contacto_id, ambito);
  if (!contacto) return { status: 404, error: 'Contacto no encontrado' };

  if (oportunidad_id) {
    const oportunidad = await buscarOportunidadVisible(oportunidad_id, ambito);
    if (!oportunidad) return { status: 404, error: 'Oportunidad no encontrada' };
    if (oportunidad.group_id !== contacto.group_id) {
      return { status: 400, error: 'La oportunidad debe pertenecer al mismo grupo que el contacto' };
    }
  }
  return null;
}

export const getInteracciones = async (req, res) => {
  try {
    const interacciones = await interaccionesService.getAll(ambitoDe(req), { oportunidadId: req.query.oportunidad_id });
    res.json(interacciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getInteraccionById = async (req, res) => {
  try {
    const interaccion = await interaccionesService.getById(req.params.id, ambitoDe(req));
    if (!interaccion) {
      return res.status(404).json({ message: 'Interacción no encontrada' });
    }
    res.json(interaccion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getInteraccionesByContacto = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    if (!(await buscarContactoVisible(req.params.contactoId, ambito))) {
      return res.status(404).json({ message: 'Contacto no encontrado' });
    }
    const interacciones = await interaccionesService.getByContactoId(req.params.contactoId, ambito);
    res.json(interacciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createInteraccion = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const invalido = await validarVinculos(req.body, ambito);
    if (invalido) return res.status(invalido.status).json({ error: invalido.error });

    const nuevaInteraccion = await interaccionesService.create(req.body, ambito);
    res.status(201).json(nuevaInteraccion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateInteraccion = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const actual = await interaccionesService.getById(req.params.id, ambito);
    if (!actual) return res.status(404).json({ message: 'Interacción no encontrada' });

    if (req.body.contacto_id || req.body.oportunidad_id) {
      const invalido = await validarVinculos({
        contacto_id: req.body.contacto_id ?? actual.contacto_id,
        oportunidad_id: req.body.oportunidad_id ?? actual.oportunidad_id
      }, ambito);
      if (invalido) return res.status(invalido.status).json({ error: invalido.error });
    }

    const actualizada = await interaccionesService.update(req.params.id, req.body, ambito);
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteInteraccion = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    if (!(await interaccionesService.getById(req.params.id, ambito))) {
      return res.status(404).json({ message: 'Interacción no encontrada' });
    }
    await interaccionesService.delete(req.params.id, ambito);
    res.json({ message: 'Interacción eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
