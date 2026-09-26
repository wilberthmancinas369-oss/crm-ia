import contactosService from '../services/contactos.service.js';

const contactosController = {
  // Crear contacto
  async create(req, res) {
    try {
      const { nombre, apellido, email, telefono, cargo, empresa_cliente, notas, empresa_id } = req.body;

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

      await contactosService.delete(id, empresa_id);
      res.json({ message: 'Contacto eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

export default contactosController;