import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validarCampos.js';
import {
  getOportunidades,
  getOportunidadById,
  createOportunidad,
  updateOportunidad,
  deleteOportunidad
} from '../controllers/oportunidades.controller.js';

const router = Router();

// Rutas de lectura
router.get('/', getOportunidades);
router.get('/:id', getOportunidadById);

// Reglas de validación base
const validacionesBase = [
  body('nombre_oportunidad').optional().notEmpty().withMessage('El nombre de la oportunidad no puede estar vacío'),
  body('contacto_id').optional().isUUID().withMessage('El contacto_id debe ser un UUID válido'),
  body('valor_estimado').optional().isNumeric().withMessage('El valor estimado debe ser un número'),
  body('etapa').optional().isString().withMessage('La etapa debe ser texto'),
  body('probabilidad').optional().isInt({ min: 0, max: 100 }).withMessage('La probabilidad debe ser un entero entre 0 y 100'),
];

// Creación (POST): Requiere obligatoriamente el nombre de la oportunidad
router.post(
  '/',
  [
    body('nombre_oportunidad').notEmpty().withMessage('El nombre de la oportunidad es obligatorio'),
    ...validacionesBase,
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

// Eliminación (DELETE)
router.delete('/:id', deleteOportunidad);

export default router;