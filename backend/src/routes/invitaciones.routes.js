import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validarCampos.js';
import { autenticar } from '../middlewares/autenticar.js';
import { aceptarInvitacion } from '../controllers/invitaciones.controller.js';

const router = Router();

// El invitado no tiene rol todavía, así que solo se exige sesión (sin autorizarRol)
router.post(
  '/aceptar',
  [autenticar, body('token').notEmpty().withMessage('El token es obligatorio'), validarCampos],
  aceptarInvitacion
);

export default router;
