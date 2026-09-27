import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validarCampos.js';
import {
  getContactos,
  getContactoById,
  createContacto,
  updateContacto,
  deleteContacto
} from '../controllers/contactos.controller.js';

const router = Router();

// Rutas de lectura
router.get('/', getContactos);
router.get('/:id', getContactoById);

// Reglas de validación para reutilizar o aplicar en las peticiones
// Reemplaza tus validaciones base en contactos.routes.js:
// Reemplaza tus validaciones base en contactos.routes.js:
const validacionesBase = [
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('apellido').optional().isString().withMessage('El apellido debe ser texto'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Debe proporcionar un email válido'),
  body('telefono').optional().isString().withMessage('El teléfono debe ser texto'),
  body('cargo').optional().isString().withMessage('El cargo debe ser texto'),
  body('empresa_cliente').optional().isString().withMessage('El nombre de la empresa debe ser texto'),
  body('notas').optional().isString().withMessage('Las notas deben ser texto'),
];

// Creación (POST): Requiere obligatoriamente el nombre
router.post(
  '/',
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    ...validacionesBase,
    validarCampos
  ],
  createContacto
);

// Actualización (PUT): Todos los campos son opcionales pero si se envían, se valida su formato
router.put(
  '/:id',
  [
    ...validacionesBase,
    validarCampos
  ],
  updateContacto
);

// Eliminación (DELETE)
router.delete('/:id', deleteContacto);

export default router;