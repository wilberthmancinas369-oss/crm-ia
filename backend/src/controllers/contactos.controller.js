import { contactosService } from '../services/contactos.service.js';
import { ambitoDe, resolverGrupoDestino } from '../services/alcance.service.js';

// Un contacto fuera del alcance del usuario responde 404, igual que uno inexistente (HU-11)

export const getContactos = async (req, res) => {
  try {
    const contactos = await contactosService.getAll(ambitoDe(req));
    res.json(contactos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getContactoById = async (req, res) => {
  try {
    const contacto = await contactosService.getById(req.params.id, ambitoDe(req));
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
    const destino = await resolverGrupoDestino(req, req.body.grupo_id);
    if (destino.error) return res.status(destino.status).json({ error: destino.error });

    const nuevoContacto = await contactosService.create(req.body, ambitoDe(req), destino.grupoId);
    res.status(201).json(nuevoContacto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateContacto = async (req, res) => {
  try {
    const actualizado = await contactosService.update(req.params.id, req.body, ambitoDe(req));
    if (!actualizado) {
      return res.status(404).json({ message: 'Contacto no encontrado' });
    }
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteContacto = async (req, res) => {
  try {
    const eliminado = await contactosService.delete(req.params.id, ambitoDe(req));
    if (!eliminado) {
      return res.status(404).json({ message: 'Contacto no encontrado' });
    }
    res.json({ message: 'Contacto eliminado correctamente' });
  } catch (error) {
    // 23503: la base no deja borrar un contacto que todavía tiene oportunidades (HU 4.1)
    if (error.code === '23503') {
      return res.status(409).json({ error: 'Este contacto tiene oportunidades. Elimínalas antes de borrar el contacto.' });
    }
    res.status(500).json({ error: error.message });
  }
};
