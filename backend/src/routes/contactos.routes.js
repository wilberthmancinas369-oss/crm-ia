import express from 'express'
import { body, param, query, validationResult } from 'express-validator';
const router = express.Router();
import contactosController from '../controllers/contactos.controller.js' 
import { validarCampos } from '../middlewares/validarCampos.js';

router.post(
  '/',
  [
    body('empresa_id')
      .optional()
      .isUUID().withMessage('El empresa_id debe ser un UUID válido'),
    body('nombre')
      .notEmpty().withMessage('El nombre es obligatorio')
      .isString().withMessage('El nombre debe ser texto')
      .trim(),
    body('email')
      .optional()
      .isEmail().withMessage('Debe ser un email válido')
      .normalizeEmail(),
    body('telefono')
      .optional()
      .isString().withMessage('El teléfono debe ser una cadena de texto'),
    body('apellido').optional().isString().trim(),
    body('cargo').optional().isString().trim(),
    body('empresa_cliente').optional().isString().trim(),
    body('notas').optional().isString(),
    validarCampos
  ],
  contactosController.create
);

// 2. Leer todos los contactos de una empresa
router.get(
  '/',
  [
    query('empresa_id')
      .notEmpty().withMessage('El empresa_id es obligatorio en la URL (?empresa_id=...)')
      .isUUID().withMessage('El empresa_id debe ser un UUID válido'),
    validarCampos
  ],
  contactosController.getAll
);

// 3. Leer un contacto por ID
router.get(
  '/:id',
  [
    param('id')
      .isUUID().withMessage('El ID del contacto en la URL debe ser un UUID válido'),
    query('empresa_id')
      .notEmpty().withMessage('El empresa_id es obligatorio en los parámetros de consulta (?empresa_id=...)')
      .isUUID().withMessage('El empresa_id debe ser un UUID válido'),
    validarCampos
  ],
  contactosController.getById
);

// 4. Actualizar contacto
router.put(
  '/:id',
  [
    param('id')
      .isUUID().withMessage('El ID del contacto en la URL debe ser un UUID válido'),
    body('empresa_id')
      .optional()
      .isUUID().withMessage('El empresa_id debe ser un UUID válido'),
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío').trim(),
    body('email').optional().isEmail().withMessage('Debe ser un email válido').normalizeEmail(),
    validarCampos
  ],
  contactosController.update
);

// 5. Eliminar contacto
router.delete(
  '/:id',
  [
    param('id')
      .isUUID().withMessage('El ID del contacto debe ser un UUID válido'),
    query('empresa_id')
      .notEmpty().withMessage('El empresa_id es obligatorio en la URL')
      .isUUID().withMessage('El empresa_id debe ser un UUID válido'),
    validarCampos
  ],
  contactosController.delete
);

export default router;
