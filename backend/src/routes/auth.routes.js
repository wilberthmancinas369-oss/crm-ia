import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { obtenerMiPerfil } from '../controllers/auth.controller.js';

const router = Router();

router.get('/me', autenticar, obtenerMiPerfil);

export default router;
