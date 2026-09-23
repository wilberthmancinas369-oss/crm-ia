const contactosService = require('../services/contactos.service');

const contactosController = {
  // Crear contacto
  async create(req, res) {
    try {
      const { nombre, apellido, email, telefono, cargo, empresa_cliente, notas, empresa_id } = req.body;
      
      if (!nombre || !empresa_id) {
        return res.status(400).json({ error: 'El nombre y el empresa_id son obligatorios' });
      }

      const contacto = await contactosService.create({
        nombre, apellido, email, telefono, cargo, empresa_cliente, notas, empresa_id
      });
      
      res.status(201).json(contacto);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener todos los contactos de la empresa
  async getAll(req, res) {
    try {
      const { empresa_id } = req.query;
      
      if (!empresa_id) {
        return res.status(400).json({ error: 'El empresa_id es obligatorio para filtrar los contactos' });
      }

      const contactos = await contactosService.getAll(empresa_id);
      res.json(contactos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener un contacto específico
  async getById(req, res) {
    try {
      const { id } = req.params;
      const { empresa_id } = req.query;
      
      if (!empresa_id) {
        return res.status(400).json({ error: 'El empresa_id es obligatorio' });
      }

      const contacto = await contactosService.getById(id, empresa_id);
      if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado' });
      
      res.json(contacto);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar contacto
  async update(req, res) {
    try {
      const { id } = req.params;
      const { empresa_id, ...updateData } = req.body;

      if (!empresa_id) {
        return res.status(400).json({ error: 'El empresa_id es obligatorio' });
      }

      const contacto = await contactosService.update(id, empresa_id, updateData);
      if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado' });
      
      res.json(contacto);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar contacto
  async delete(req, res) {
    try {
      const { id } = req.params;
      const { empresa_id } = req.query;

      if (!empresa_id) {
        return res.status(400).json({ error: 'El empresa_id es obligatorio' });
      }

      await contactosService.delete(id, empresa_id);
      res.json({ message: 'Contacto eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = contactosController;
