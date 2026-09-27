import { contactosService } from '../services/contactos.service.js';

export const getContactos = async (req, res) => {
  try {
    const contactos = await contactosService.getAll();
    res.json(contactos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getContactoById = async (req, res) => {
  try {
    const contacto = await contactosService.getById(req.params.id);
    if (!contacto) {
      return res.status(404).json({ message: 'Contacto no encontrado' });
    }
    res.json(contacto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createContacto = async (req, res) => {
  try {
    const nuevoContacto = await contactosService.create(req.body);
    res.status(201).json(nuevoContacto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateContacto = async (req, res) => {
  try {
    const actualizado = await contactosService.update(req.params.id, req.body);
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteContacto = async (req, res) => {
  try {
    await contactosService.delete(req.params.id);
    res.json({ message: 'Contacto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};