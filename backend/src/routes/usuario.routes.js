import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { autorizarRol } from '../middlewares/autorizarRol.js';
import { PERMISOS, NIVELES } from '../config/permisos.js';
import { usuarioController } from '../controllers/usuario.controller.js';

const router = Router();

// Todos estos endpoints requieren al menos ser Jefe de Área (Nivel 1)
// El Agente (Nivel 0) no tiene acceso a ninguna de estas rutas.
const NIVELES_MINIMOS = {
  GESTOR: 1 // Jefe de Área o Administrador
};

router.post('/cambiar-rol', [autenticar, autorizarRol(NIVELES_MINIMOS.GESTOR)], usuarioController.cambiarRol);
router.post('/mover-grupo', [autenticar, autorizarRol(NIVELES_MINIMOS.GESTOR)], usuarioController.moverGrupo);
router.post('/remover-grupo', [autenticar, autorizarRol(NIVELES_MINIMOS.GESTOR)], usuarioController.removerGrupo);
router.post('/eliminar-empresa', [autenticar, autorizarRol(NIVELES.ADMINISTRADOR)], usuarioController.eliminarDeEmpresa);

export default router;
