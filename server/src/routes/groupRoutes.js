const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authorizeRole = require('../middleware/auth');

// MinLevel 1 = Jefe de Área, MinLevel 2 = Administrador. 
// Requerimiento: "Administrador de Empresa o Jefe de Área" -> minLevel: 1
router.post('/', authorizeRole(1), groupController.createGroup);

module.exports = router;
