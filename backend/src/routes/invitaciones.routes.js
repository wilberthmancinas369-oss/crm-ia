import { Router } from 'express';
import { body, param } from 'express-validator';
import { validarCampos } from '../middlewares/validarCampos.js';
import { obtenerInvitacion, aceptarInvitacion } from '../controllers/invitaciones.controller.js';

const router = Router();

// Rutas públicas: el invitado todavía no tiene cuenta. El token (64 caracteres hex,
// generado con crypto.randomBytes) es lo que autoriza la operación.
const validarToken = param('token').isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('El enlace de invitación no es válido');

// Mismas reglas de contraseña que el registro de empresa (RegistroEmpresa.jsx)
export const validacionesAceptar = [
  body('nombre').trim().notEmpty().withMessage('Tu nombre es obligatorio'),
  body('nombre').isLength({ max: 100 }).withMessage('El nombre no puede exceder los 100 caracteres'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('password').matches(/[A-Za-z]/).withMessage('La contraseña debe incluir al menos una letra'),
  body('password').matches(/\d/).withMessage('La contraseña debe incluir al menos un número'),
];

router.get('/:token', [validarToken, validarCampos], obtenerInvitacion);

router.post('/:token/aceptar', [validarToken, ...validacionesAceptar, validarCampos], aceptarInvitacion);

export default router;
