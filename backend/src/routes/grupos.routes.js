import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validarCampos.js';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizar } from '../middlewares/autorizarRol.js';
import { autorizarGrupo } from '../middlewares/autorizarGrupo.js';
import { invitarUsuario } from '../controllers/invitaciones.controller.js';
import { createGrupo, renombrarGrupo, eliminarGrupo, listGrupos, listGruposConMiembros, listAsignables } from '../controllers/grupos.controller.js';

const router = Router();

export const validacionesGrupo = [
  body('name').trim().notEmpty().withMessage('El nombre del grupo es obligatorio'),
  body('name').isLength({ max: 100 }).withMessage('El nombre del grupo no puede exceder los 100 caracteres'),
  body('description').optional().isString().withMessage('La descripción debe ser texto'),
];

export const validacionesInvitacion = [
  body('email').trim().toLowerCase().isEmail().withMessage('Debe proporcionar un email válido'),
  body('role_id').notEmpty().withMessage('El rol es obligatorio'),
];

// Cada quien ve sus grupos; el Administrador, todos
router.get('/', [autenticar, autorizar('verGrupos')], listGrupos);

// Miembros e invitaciones pendientes de cada grupo (pantalla Grupos)
router.get('/miembros', [autenticar, autorizar('verMiembros')], listGruposConMiembros);

// Responsables y colaboradores posibles para oportunidades del grupo (cualquier miembro del CRM en ese grupo)
router.get('/:id/asignables', [autenticar, autorizar('gestionarCRM'), autorizarGrupo('id')], listAsignables);

router.post(
  '/',
  // Solo el Administrador crea grupos (HU-11)
  [autenticar, autorizar('crearGrupos'), ...validacionesGrupo, validarCampos],
  createGrupo
  
);



router.post(
  '/:id/invitar',
  // El Jefe de Área solo invita a los grupos que dirige; el rol se valida en el controlador
  [autenticar, autorizar('invitarUsuarios'), autorizarGrupo('id'), ...validacionesInvitacion, validarCampos],
  invitarUsuario
);

router.patch(
  '/:id',
  // Solo el Administrador renombra grupos (HU-14); el controlador valida que el grupo sea de su empresa
  [autenticar, autorizar('renombrarGrupos'), ...validacionesGrupo, validarCampos],
  renombrarGrupo
);

router.delete(
  '/:id',
  // Solo el Administrador elimina grupos (HU-14); el grupo debe estar vacío
  [autenticar, autorizar('eliminarGrupos')],
  eliminarGrupo
);

export default router;
