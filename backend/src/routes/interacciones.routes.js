import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validarCampos.js';
import {
  getInteracciones,
  getInteraccionById,
  getInteraccionesByContacto,
  createInteraccion,
  updateInteraccion,
  deleteInteraccion
} from '../controllers/interacciones.controller.js';

const router = Router();

// Rutas de lectura
router.get('/', getInteracciones);
router.get('/:id', getInteraccionById);
router.get('/contacto/:contactoId', getInteraccionesByContacto);

// Reglas de validación base
const validacionesBase = [
  body('contacto_id').optional().isUUID().withMessage('El contacto_id debe ser un UUID válido'),
  body('oportunidad_id').optional().isUUID().withMessage('El oportunidad_id debe ser un UUID válido'),
  body('tipo').optional().notEmpty().withMessage('El tipo de interacción no puede estar vacío'),
  body('detalle').optional().notEmpty().withMessage('El detalle de la interacción no puede estar vacío'),
];

// Creación (POST): Requiere obligatoriamente contacto_id, tipo y detalle
router.post(
  '/',
  [
    body('contacto_id').isUUID().withMessage('Debe proporcionar un contacto_id válido (UUID)'),
    body('tipo').notEmpty().withMessage('El tipo de interacción es obligatorio (ej. Llamada, Email, Reunión)'),
    body('detalle').notEmpty().withMessage('El detalle de la interacción es obligatorio'),
    ...validacionesBase,
    validarCampos
  ],
  createInteraccion
);

// Actualización (PUT): Campos opcionales con validación
router.put(
  '/:id',
  [
    ...validacionesBase,
    validarCampos
  ],
  updateInteraccion
);

// Eliminación (DELETE)
router.delete('/:id', deleteInteraccion);

export default router;