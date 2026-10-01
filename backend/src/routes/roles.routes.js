import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizarRol } from '../middlewares/autorizarRol.js';
import { PERMISOS } from '../config/permisos.js';
import { listRolesInvitables } from '../controllers/roles.controller.js';

const router = Router();

// Solo quien puede invitar (Jefe de Área o Administrador) necesita la lista de roles
router.get('/invitables', [autenticar, autorizarRol(PERMISOS.invitarUsuarios)], listRolesInvitables);

export default router;
