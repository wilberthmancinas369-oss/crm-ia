import { Router } from 'express';
import { query } from 'express-validator';
import { getReporteJefe, getReporteGeneral } from '../controllers/reportes.controller.js';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizar } from '../middlewares/autorizarRol.js';
import { validarCampos } from '../middlewares/validarCampos.js';

const router = Router();
router.get('/jefe',
  autenticar,
  autorizar('verReporteGrupo'),
  query('grupo_id').optional().isUUID().withMessage('El grupo_id debe ser un UUID válido'),
  validarCampos,
  getReporteJefe
);
router.get('/general', autenticar, autorizar('verReporteGeneral'), getReporteGeneral);
export default router;
