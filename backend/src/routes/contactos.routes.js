const express = require('express');
const router = express.Router();
const contactosController = require('../controllers/contactos.controller');

// Definición de rutas para el CRUD de contactos
router.post('/', contactosController.create);           // Crear
router.get('/', contactosController.getAll);             // Leer todos
router.get('/:id', contactosController.getById);          // Leer uno
router.put('/:id', contactosController.update);          // Actualizar
router.delete('/:id', contactosController.delete);      // Eliminar

module.exports = router;
