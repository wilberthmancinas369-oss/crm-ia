import { Router } from 'express';
import { body, param } from 'express-validator';
import { validarCampos } from '../middlewares/validarCampos.js';
import { validarFiltrosListado } from '../middlewares/validarFiltrosListado.js';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizar } from '../middlewares/autorizarRol.js';
import {
  getOportunidades,
  getOportunidadById,
  createOportunidad,
  updateOportunidad,
  deleteOportunidad,
  getColaboradores,
  addColaborador,
  removeColaborador,
  reasignarOportunidad,
  getHistorialReasignaciones
} from '../controllers/oportunidades.controller.js';
import { ETAPAS } from '../config/crm.js';
import { sugerirOportunidad } from '../controllers/ia.controller.js';

const router = Router();

// Todas las rutas requieren sesión; autorizar deja la empresa en req.company_id y los grupos
// visibles en req.alcance (Agente y Jefe: sus grupos; Administrador: toda la empresa)
router.use(autenticar, autorizar('gestionarCRM'));
router.post('/:id/sugerencia-ia', [param('id').isUUID().withMessage('Oportunidad no válida'), validarCampos], sugerirOportunidad);

// Rutas de lectura
router.get('/', validarFiltrosListado('oportunidades'), getOportunidades);
router.get('/:id', getOportunidadById);
router.get('/:id/reasignaciones', [param('id').isUUID().withMessage('El ID de la oportunidad debe ser un UUID válido'), validarCampos], getHistorialReasignaciones);

// Reglas de validación base
// El grupo no se elige: la oportunidad toma el de su contacto (HU 4.1)
export const validacionesBase = [
  body('nombre_oportunidad').optional().trim().notEmpty().withMessage('El nombre de la oportunidad no puede estar vacío'),
  body('contacto_id').optional().isUUID().withMessage('El contacto_id debe ser un UUID válido'),
  body('valor_estimado').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('El monto debe ser un número mayor o igual a 0'),
  body('etapa').optional().isIn(ETAPAS).withMessage(`La etapa debe ser una de: ${ETAPAS.join(', ')}`),
  body('probabilidad').optional({ values: 'falsy' }).isInt({ min: 0, max: 100 }).withMessage('La probabilidad debe ser un entero entre 0 y 100'),
  body('fecha_cierre_prevista').optional({ values: 'falsy' }).isISO8601().withMessage('La fecha de cierre debe tener formato AAAA-MM-DD'),
  body('responsable_id').optional({ values: 'null' }).isUUID().withMessage('El responsable debe ser un UUID válido'),
];

// Creación (POST): nombre y contacto obligatorios
export const validacionesCrear = [
  body('nombre_oportunidad').trim().notEmpty().withMessage('El nombre de la oportunidad es obligatorio'),
  body('contacto_id').notEmpty().withMessage('El contacto es obligatorio'),
  ...validacionesBase
];

router.post(
  '/',
  [
    ...validacionesCrear,
    validarCampos
  ],
  createOportunidad
);

// Actualización (PUT): Campos opcionales con validación
router.put(
  '/:id',
  [
    ...validacionesBase,
    validarCampos
  ],
  updateOportunidad
);

// Reasignación de responsable (HU-7): solo Jefe de Área o Administrador
router.patch(
  '/:id/reasignar',
  [
    param('id').isUUID().withMessage('El ID de la oportunidad debe ser un UUID válido'),
    body('responsable_id').notEmpty().withMessage('El responsable_id es obligatorio').isUUID().withMessage('El responsable_id debe ser un UUID válido'),
    validarCampos
  ],
  reasignarOportunidad
);


// Eliminación (DELETE)
router.delete('/:id', deleteOportunidad);

// Colaboradores: otros usuarios del grupo que ayudan con la oportunidad
router.get('/:id/colaboradores', getColaboradores);
router.post(
  '/:id/colaboradores',
  [body('user_id').isUUID().withMessage('Indica el usuario (user_id)'), validarCampos],
  addColaborador
);
router.delete(
  '/:id/colaboradores/:userId',
  [param('userId').isUUID().withMessage('Usuario no válido'), validarCampos],
  removeColaborador
);

export default router;
