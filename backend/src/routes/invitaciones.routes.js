import express from 'express';
import { invitacionesController } from '../controllers/invitaciones.controller.js';

const router = express.Router();

router.post('/enviar', invitacionesController.sendInvitation);

export default router;
