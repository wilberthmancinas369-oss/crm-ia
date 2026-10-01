import { oportunidadesService } from '../services/oportunidades.service.js';

// La empresa sale de la sesión (req.company_id, middleware autorizarRol), nunca del body ni del query.

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
    const oportunidades = await oportunidadesService.getAll(req.company_id);
    res.json(oportunidades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOportunidadById = async (req, res) => {
  try {
    const oportunidad = await oportunidadesService.getById(req.params.id, req.company_id);
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
    const nuevaOportunidad = await oportunidadesService.create(camposOportunidad(req.body), req.company_id);
    res.status(201).json(nuevaOportunidad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOportunidad = async (req, res) => {
  try {
    const actualizada = await oportunidadesService.update(req.params.id, req.company_id, camposOportunidad(req.body));
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOportunidad = async (req, res) => {
  try {
    await oportunidadesService.delete(req.params.id, req.company_id);
    res.json({ message: 'Oportunidad eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
