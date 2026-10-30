import { Router } from 'express';
import { body } from 'express-validator';
import validator from 'validator';
import { REDES_SOCIALES, ESTADOS_CONTACTO } from '../config/crm.js';
import { validarFiltrosListado } from '../middlewares/validarFiltrosListado.js';
import { validarCampos } from '../middlewares/validarCampos.js';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizar } from '../middlewares/autorizarRol.js';
import {
  getContactos,
  getContactoById,
  createContacto,
  updateContacto,
  deleteContacto
} from '../controllers/contactos.controller.js';

const router = Router();

// Todas las rutas requieren sesión; autorizar deja la empresa en req.company_id y los grupos
// visibles en req.alcance (Agente y Jefe: sus grupos; Administrador: toda la empresa)
router.use(autenticar, autorizar('gestionarCRM'));

// Rutas de lectura
router.get('/', validarFiltrosListado('contactos'), getContactos);
router.get('/:id', getContactoById);

// redes_sociales: { linkedin, facebook, instagram, x, sitio_web } con URLs; los vacíos se descartan
const validarRedes = (redes) => {
  if (typeof redes !== 'object' || redes === null || Array.isArray(redes)) {
    throw new Error('redes_sociales debe ser un objeto');
  }
  for (const [red, url] of Object.entries(redes)) {
    if (!REDES_SOCIALES.includes(red)) throw new Error(`Red social no permitida: ${red}`);
    if (url && !validator.isURL(String(url), { require_protocol: true })) {
      throw new Error(`El enlace de ${red} debe ser una URL completa (https://...)`);
    }
  }
  return true;
};
const limpiarRedes = (redes) =>
  Object.fromEntries(Object.entries(redes).filter(([, url]) => url).map(([red, url]) => [red, String(url).trim()]));

// Reglas de validación para reutilizar o aplicar en las peticiones
const validacionesBase = [
  body('estado').optional().isIn(ESTADOS_CONTACTO).withMessage('El estado debe ser Activo o Inactivo'),
  body('grupo_id').optional({ values: 'falsy' }).isUUID().withMessage('El grupo_id debe ser un UUID válido'),
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('apellido').optional().isString().withMessage('El apellido debe ser texto'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Debe proporcionar un email válido'),
  body('telefono').optional().isString().withMessage('El teléfono debe ser texto'),
  body('cargo').optional().isString().withMessage('El puesto debe ser texto'),
  body('redes_sociales').optional().custom(validarRedes).customSanitizer(limpiarRedes),
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
