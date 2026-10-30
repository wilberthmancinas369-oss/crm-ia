import { Router } from 'express';
import { body, param } from 'express-validator';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizar } from '../middlewares/autorizarRol.js';
import { validarCampos } from '../middlewares/validarCampos.js';
import { validarFiltrosListado } from '../middlewares/validarFiltrosListado.js';
import { getMisTareas, createTarea, updateTarea, completarTarea } from '../controllers/tareas.controller.js';

const router = Router();
router.use(autenticar, autorizar('gestionarCRM'));

// En creación son obligatorios; en edición solo se validan los campos enviados.
export const validacionesTarea = (crear = false) => {
  const titulo = body('titulo');
  const fecha = body('fecha_limite');
  const responsable = body('responsable_id');
  if (!crear) {
    titulo.optional();
    fecha.optional();
    responsable.optional();
  }
  return [
    titulo.isString().bail().trim().notEmpty().withMessage('El título es obligatorio'),
    fecha.isString().bail().isISO8601({ strict: true }).withMessage('La fecha límite debe ser una fecha ISO 8601 válida'),
    responsable.isUUID().withMessage('El responsable_id debe ser un UUID válido'),
    body('estado').optional().isIn(['Pendiente', 'En progreso', 'Completada']).withMessage('Estado de tarea inválido'),
    body('contacto_id').optional({ values: 'null' }).isUUID().withMessage('El contacto_id debe ser un UUID válido'),
    body('oportunidad_id').optional({ values: 'null' }).isUUID().withMessage('El oportunidad_id debe ser un UUID válido')
  ];
};

const validarId = () => param('id').isUUID().withMessage('El id de la tarea debe ser un UUID válido');

router.get('/', validarFiltrosListado('tareas'), getMisTareas);
router.post('/', validacionesTarea(true), validarCampos, createTarea);
router.put('/:id', validarId(), validacionesTarea(), validarCampos, updateTarea);
router.patch('/:id/completar', validarId(), validarCampos, completarTarea);

export default router;
