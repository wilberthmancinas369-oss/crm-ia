import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validarCampos.js';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizarRol } from '../middlewares/autorizarRol.js';
import { PERMISOS } from '../config/permisos.js';
import { createGrupo, listGrupos } from '../controllers/grupos.controller.js';
import { invitarUsuario } from '../controllers/invitaciones.controller.js';

const router = Router();

export const validacionesGrupo = [
  body('name').trim().notEmpty().withMessage('El nombre del grupo es obligatorio'),
  body('name').isLength({ max: 100 }).withMessage('El nombre del grupo no puede exceder los 100 caracteres'),
  body('description').optional().isString().withMessage('La descripción debe ser texto'),
];

export const validacionesInvitacion = [
  body('email').isEmail().withMessage('Debe proporcionar un email válido'),
  body('role_id').notEmpty().withMessage('El rol es obligatorio'),
];

// Cualquier miembro de la empresa puede ver sus grupos
router.get('/', [autenticar, autorizarRol(PERMISOS.verGrupos)], listGrupos);

router.post(
  '/',
  [autenticar, autorizarRol(PERMISOS.crearGrupos), ...validacionesGrupo, validarCampos],
  createGrupo
);

router.post(
  '/:id/invitar',
  [autenticar, autorizarRol(PERMISOS.invitarUsuarios), ...validacionesInvitacion, validarCampos],
  invitarUsuario
);

export default router;
