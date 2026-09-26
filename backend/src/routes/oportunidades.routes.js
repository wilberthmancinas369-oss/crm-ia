import express from 'express';
import { body, param, query } from 'express-validator';
import oportunidadesController from '../controllers/oportunidades.controller.js';
import { validarCampos } from '../middlewares/validarCampos.js';

const router = express.Router();

// 1. Crear Oportunidad
router.post(
  '/',
  [
    body('empresa_id')
      .notEmpty().withMessage('El empresa_id es obligatorio')
      .isUUID().withMessage('El empresa_id debe ser un UUID válido'),
    body('contacto_id')
      .notEmpty().withMessage('El contacto_id es obligatorio')
      .isUUID().withMessage('El contacto_id debe ser un UUID válido'),
    body('nombre_oportunidad')
      .notEmpty().withMessage('El nombre de la oportunidad es obligatorio')
      .isString().withMessage('El nombre debe ser texto')
      .trim(),
    body('valor_estimado')
      .optional()
      .isNumeric().withMessage('El valor estimado debe ser un número'),
    body('etapa')
      .optional()
      .isString().withMessage('La etapa debe ser un texto')
      .trim(),
    body('fecha_cierre_prevista')
      .optional()
      .isISO8601().withMessage('La fecha debe ser una fecha válida (formato YYYY-MM-DD)'),
    body('probabilidad')
      .optional()
      .isInt({ min: 0, max: 100 }).withMessage('La probabilidad debe ser un entero entre 0 y 100'),
    validarCampos
  ],
  oportunidadesController.create
);

// 2. Leer todas las oportunidades de una empresa
router.get(
  '/',
  [
    query('empresa_id')
      .notEmpty().withMessage('El empresa_id es obligatorio en la URL (?empresa_id=...)')
      .isUUID().withMessage('El empresa_id debe ser un UUID válido'),
    validarCampos
  ],
  oportunidadesController.getAll
);

// 3. Leer una oportunidad por ID
router.get(
  '/:id',
  [
    param('id')
      .isUUID().withMessage('El ID de la oportunidad debe ser un UUID válido'),
    query('empresa_id')
      .notEmpty().withMessage('El empresa_id es obligatorio en los parámetros de consulta (?empresa_id=...)')
      .isUUID().withMessage('El empresa_id debe ser un UUID válido'),
    validarCampos
  ],
  oportunidadesController.getById
);

// 4. Actualizar oportunidad
router.put(
  '/:id',
  [
    param('id')
      .isUUID().withMessage('El ID de la oportunidad debe ser un UUID válido'),
    body('empresa_id')
      .notEmpty().withMessage('El empresa_id es obligatorio en el body')
      .isUUID().withMessage('El empresa_id debe ser un UUID válido'),
    body('contacto_id')
      .optional()
      .isUUID().withMessage('El contacto_id debe ser un UUID válido'),
    body('nombre_oportunidad')
      .optional()
      .notEmpty().withMessage('El nombre no puede estar vacío')
      .trim(),
    body('valor_estimado')
      .optional()
      .isNumeric().withMessage('El valor estimado debe ser un número'),
    body('fecha_cierre_prevista')
      .optional()
      .isISO8601().withMessage('La fecha debe tener un formato válido (YYYY-MM-DD)'),
    body('probabilidad')
      .optional()
      .isInt({ min: 0, max: 100 }).withMessage('La probabilidad debe estar entre 0 y 100'),
    validarCampos
  ],
  oportunidadesController.update
);

// 5. Eliminar oportunidad
router.delete(
  '/:id',
  [
    param('id')
      .isUUID().withMessage('El ID de la oportunidad debe ser un UUID válido'),
    query('empresa_id')
      .notEmpty().withMessage('El empresa_id es obligatorio en la URL')
      .isUUID().withMessage('El empresa_id debe ser un UUID válido'),
    validarCampos
  ],
  oportunidadesController.delete
);

export default router;