import { oportunidadesService } from '../services/oportunidades.service.js';

export const getOportunidades = async (req, res) => {
  try {
    const oportunidades = await oportunidadesService.getAll();
    res.json(oportunidades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOportunidadById = async (req, res) => {
  try {
    const oportunidad = await oportunidadesService.getById(req.params.id);
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
    const nuevaOportunidad = await oportunidadesService.create(req.body);
    res.status(201).json(nuevaOportunidad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOportunidad = async (req, res) => {
  try {
    const actualizada = await oportunidadesService.update(req.params.id, req.body);
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOportunidad = async (req, res) => {
  try {
    await oportunidadesService.delete(req.params.id);
    res.json({ message: 'Oportunidad eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};