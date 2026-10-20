import { Router } from 'express';
import { body } from 'express-validator';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizar } from '../middlewares/autorizarRol.js';
import { validarCampos } from '../middlewares/validarCampos.js';
import { usuarioController } from '../controllers/usuario.controller.js';

const router = Router();

const uuid = (campo) => body(campo).isUUID().withMessage(`${campo} debe ser un UUID válido`);

// HU-9. gestionarMiembros: Jefe de Área (en sus grupos) y Administrador. El controlador revisa
// el grupo concreto y el rol del miembro con config/permisos.js. El Agente no entra a ninguna.
const gestionar = [autenticar, autorizar('gestionarMiembros')];

router.post('/cambiar-rol', [...gestionar, uuid('userId'), uuid('groupId'), uuid('roleId'), validarCampos], usuarioController.cambiarRol);
router.post('/mover-grupo', [...gestionar, uuid('userId'), uuid('oldGroupId'), uuid('newGroupId'), validarCampos], usuarioController.moverGrupo);
router.post('/eliminar-empresa', [autenticar, autorizar('administrarUsuarios'), uuid('userId'), validarCampos], usuarioController.eliminarDeEmpresa);

export default router;
