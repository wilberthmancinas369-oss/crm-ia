import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizarRol } from '../middlewares/autorizarRol.js';
import { listRolesInvitables } from '../controllers/roles.controller.js';

const router = Router();

// Solo quien puede invitar (Jefe de Área o Administrador) necesita la lista de roles
router.get('/invitables', [autenticar, autorizarRol(1)], listRolesInvitables);

export default router;
