const oportunidadesService = require('../services/oportunidades.service');

const oportunidadesController = {
  // Crear oportunidad
  async create(req, res) {
    try {
      const { nombre_oportunidad, valor_estimado, etapa, fecha_cierre_prevista, probabilidad, contacto_id, empresa_id } = req.body;
      
      if (!nombre_oportunidad || !empresa_id || !contacto_id) {
        return res.status(400).json({ error: 'El nombre de la oportunidad, el empresa_id y el contacto_id son obligatorios' });
      }

      const oportunidad = await oportunidadesService.create({
        nombre_oportunidad, valor_estimado, etapa, fecha_cierre_prevista, probabilidad, contacto_id, empresa_id
      });
      
      res.status(201).json(oportunidad);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener todas las oportunidades de la empresa
  async getAll(req, res) {
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
  },

  // Obtener una oportunidad específica
  async getById(req, res) {
    try {
      const { id } = req.params;
      const { empresa_id } = req.query;
      
      if (!empresa_id) {
        return res.status(400).json({ error: 'El empresa_id es obligatorio' });
      }

      const oportunidad = await oportunidadesService.getById(id, empresa_id);
      if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });
      
      res.json(oportunidad);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar oportunidad
  async update(req, res) {
    try {
      const { id } = req.params;
      const { empresa_id, ...updateData } = req.body;

      if (!empresa_id) {
        return res.status(400).json({ error: 'El empresa_id es obligatorio' });
      }

      const oportunidad = await oportunidadesService.update(id, empresa_id, updateData);
      if (!oportunidad) return res.status(404).json({ error: 'Oportunidad no encontrada' });
      
      res.json(oportunidad);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar oportunidad
  async delete(req, res) {
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
  }
};

module.exports = oportunidadesController;
