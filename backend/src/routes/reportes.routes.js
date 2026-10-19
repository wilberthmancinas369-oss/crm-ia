import express from 'express';
import { getReporteJefe, getReporteGeneral } from '../controllers/reportes.controller.js';
import { autenticar } from '../middlewares/autenticar.js'; // ajusta el path según tus otras rutas
import { autorizar } from '../middlewares/autorizarRol.js';

const router = express.Router();

// HU-5: Reporte Jefe de Área
router.get('/jefe', autenticar, autorizar('verReporteGrupo'), getReporteJefe);

// HU-8: Reporte General Empresa
router.get('/general', autenticar, autorizar('verReporteGeneral'), getReporteGeneral);

export default router;