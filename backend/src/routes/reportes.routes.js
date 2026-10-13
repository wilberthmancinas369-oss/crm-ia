import express from 'express';
import { getReporteJefe } from '../controllers/reportes.controller.js';
import { autorizar } from '../middlewares/autorizarRol.js'; // <--- CORREGIDO AQUÍ

const router = express.Router();

// Utilizamos el middleware 'autorizar' del equipo para validar el permiso de ver reportes
// El permiso 'ver_reportes' debe estar definido en config/permisos.js
router.get('/jefe', autorizar('ver_//reportes'), getReporteJefe);

export default router;