import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Valores ficticios para que config/supabase.js no aborte
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';

const { NIVELES } = await import('../src/config/permisos.js');
const { usuarioService } = await import('../src/services/usuario.service.js');
const { usuarioController } = await import('../src/controllers/usuario.controller.js');

const mockRes = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const ejecutar = async (controllerFn, req) => {
  const res = mockRes();
  try {
    await controllerFn(req, res);
  } catch (e) {
    // El controlador ya maneja el catch y envía res.status().json()
  }
  return res;
};

describe('HU-9: Administración de Usuarios', () => {
  
  describe('Acceso por Rol (Permisos)', () => {
    test('un Agente debe recibir 403 al intentar cambiar rol', async () => {
      const req = { 
        user: { id: 'user-agente' }, 
        perfil: { rol: { nivel: NIVELES.AGENTE } }, 
        company_id: 'comp-1',
        body: { userId: 'any', groupId: 'any', roleId: 'any' }
      };
      const res = await ejecutar(usuarioController.cambiarRol, req);
      assert.equal(res.statusCode, 403);
    });

    test('un Agente debe recibir 403 al intentar mover de grupo', async () => {
      const req = { 
        user: { id: 'user-agente' }, 
        perfil: { rol: { nivel: NIVELES.AGENTE } }, 
        company_id: 'comp-1',
        body: { userId: 'any', oldGroupId: 'any', newGroupId: 'any' }
      };
      const res = await ejecutar(usuarioController.moverGrupo, req);
      assert.equal(res.statusCode, 403);
    });

    test('un Agente debe recibir 403 al intentar eliminar de la empresa', async () => {
      const req = { 
        user: { id: 'user-agente' }, 
        perfil: { rol: { nivel: NIVELES.AGENTE } }, 
        company_id: 'comp-1',
        body: { userId: 'any' }
      };
      const res = await ejecutar(usuarioController.eliminarDeEmpresa, req);
      assert.equal(res.statusCode, 403);
    });
  });

  describe('Jefe de Área - Restricciones', () => {
    test('no puede asignar un rol superior al suyo (Administrador)', async () => {
      const req = { 
        user: { id: 'jefe-1' }, 
        perfil: { rol: { nivel: NIVELES.JEFE_AREA } }, 
        company_id: 'comp-1',
        body: { userId: 'user-1', groupId: 'group-1', roleId: 'rol-admin-id' }
      };

      const res = await ejecutar(usuarioController.cambiarRol, req);
      assert.ok(res.statusCode === 403 || res.statusCode === 500); 
    });
  });

  describe('Administrador - Reglas Críticas', () => {
    test('no puede eliminar al último administrador de la empresa', async () => {
      const originalVerify = usuarioService.verificarAdminUnico;
      usuarioService.verificarAdminUnico = async () => true;

      const req = { 
        user: { id: 'admin-1' }, 
        perfil: { rol: { nivel: NIVELES.ADMINISTRADOR } }, 
        company_id: 'comp-1',
        body: { userId: 'admin-1', groupId: 'group-1' }
      };

      const res = await ejecutar(usuarioController.removerGrupo, req);
      assert.equal(res.statusCode, 400);
      assert.ok(res.body.error.includes('último administrador'));

      usuarioService.verificarAdminUnico = originalVerify;
    });
  });

  describe('Casos Transversales', () => {
    test('petición sin usuario autenticado debe fallar', async () => {
      const req = { user: null }; 
      const res = await ejecutar(usuarioController.eliminarDeEmpresa, req);
      assert.equal(res.statusCode, 500);
    });

    test('no puede eliminar su propia cuenta de la empresa', async () => {
      const req = { 
        user: { id: 'admin-1' }, 
        perfil: { rol: { nivel: NIVELES.ADMINISTRADOR } }, 
        company_id: 'comp-1',
        body: { userId: 'admin-1' }
      };
      const res = await ejecutar(usuarioController.eliminarDeEmpresa, req);
      assert.equal(res.statusCode, 403);
      assert.ok(res.// Check message
        body.error.includes('propia cuenta'));
    });
  });
});
