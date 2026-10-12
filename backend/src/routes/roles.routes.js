import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizar } from '../middlewares/autorizarRol.js';
import { listRolesInvitables } from '../controllers/roles.controller.js';

const router = Router();

// Solo quien puede invitar (Jefe de Área o Administrador) necesita la lista de roles
router.get('/invitables', [autenticar, autorizar('invitarUsuarios')], listRolesInvitables);

export default router;
