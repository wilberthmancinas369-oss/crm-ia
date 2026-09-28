const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const authorizeRole = require('../middleware/auth');

// MinLevel 1 = Jefe de Área, MinLevel 2 = Administrador
router.post('/:id/invite', authorizeRole(1), invitationController.inviteUser);

module.exports = router;
