import { oportunidadesService } from '../services/oportunidades.service.js';

export const getOportunidades = async (req, res) => {
  try {
    const { empresa_id } = req.query;
    if (!empresa_id) {
      return res.status(400).json({ error: 'El empresa_id es obligatorio' });
    }
    const oportunidades = await oportunidadesService.getAll(empresa_id);
    res.json(oportunidades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOportunidadById = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa_id } = req.query;
    if (!empresa_id) {
      return res.status(400).json({ error: 'El empresa_id es obligatorio' });
    }
    const oportunidad = await oportunidadesService.getById(id, empresa_id);
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
    const { empresa_id, ...data } = req.body;
    if (!empresa_id) {
      return res.status(400).json({ error: 'El empresa_id es obligatorio' });
    }
    // Mapeo explícito para coincidir con el diagrama: titulo, valor, etapa, fecha_cierre
    const nuevaOportunidad = await oportunidadesService.create({
      empresa_id,
      titulo: data.titulo || data.nombre_oportunidad,
      valor: data.valor || data.valor_estimado,
      etapa: data.etapa,
      fecha_cierre: data.fecha_cierre || data.fecha_cierre_prevista,
      contacto_id: data.contacto_id,
      probabilidad: data.probabilidad
    });
    res.status(201).json(nuevaOportunidad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOportunidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa_id, ...updateData } = req.body;
    if (!empresa_id) {
      return res.status(400).json({ error: 'El empresa_id es obligatorio' });
    }
    const actualizada = await oportunidadesService.update(id, empresa_id, updateData);
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOportunidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa_id } = req.query;
    if (!empresa_id) {
      return res.status(400).json({ error: 'El empresa_id es obligatorio' });
    }
    await oportunidadesService.delete(id, empresa_id);
    res.json({ message: 'Oportunidad eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// El export ya se define arriba en cada función con "export const ..."

