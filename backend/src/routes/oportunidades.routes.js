const express = require('express');
const router = express.Router();
const oportunidadesController = require('../controllers/oportunidades.controller');

// Definición de rutas para el CRUD de oportunidades
router.post('/', oportunidadesController.create);           // Crear
router.get('/', oportunidadesController.getAll);             // Leer todos
router.get('/:id', oportunidadesController.getById);          // Leer uno
router.put('/:id', oportunidadesController.update);          // Actualizar
router.delete('/:id', oportunidadesController.delete);      // Eliminar

module.exports = router;
