import { interaccionesService } from '../services/interacciones.service.js';

export const getInteracciones = async (req, res) => {
  try {
    const interacciones = await interaccionesService.getAll();
    res.json(interacciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getInteraccionById = async (req, res) => {
  try {
    const interaccion = await interaccionesService.getById(req.params.id);
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
    const interacciones = await interaccionesService.getByContactoId(req.params.contactoId);
    res.json(interacciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createInteraccion = async (req, res) => {
  try {
    const nuevaInteraccion = await interaccionesService.create(req.body);
    res.status(201).json(nuevaInteraccion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateInteraccion = async (req, res) => {
  try {
    const actualizada = await interaccionesService.update(req.params.id, req.body);
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteInteraccion = async (req, res) => {
  try {
    await interaccionesService.delete(req.params.id);
    res.json({ message: 'Interacción eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};