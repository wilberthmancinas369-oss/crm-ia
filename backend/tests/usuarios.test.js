import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Valores ficticios para que config/supabase.js no aborte
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';

const { NIVELES } = await import('../src/config/permisos.js');
const { default: supabase } = await import('../src/config/supabase.js');
const { usuarioService } = await import('../src/services/usuario.service.js');
const { usuarioController } = await import('../src/controllers/usuario.controller.js');

// Niveles (con respaldo por si alguna clave no existe en permisos.js)
const AGENTE = NIVELES.AGENTE ?? 0;
const JEFE_AREA = NIVELES.JEFE_AREA ?? 1;
const ADMINISTRADOR = NIVELES.ADMINISTRADOR;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const mockRes = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const ejecutar = async (controllerFn, req) => {
  const res = mockRes();
  try {
    await controllerFn(req, res);
  } catch (e) {
    // El controlador ya maneja su catch y responde con res.status().json()
  }
  return res;
};

/**
 * Reemplaza supabase.from() por un constructor de consultas falso, sin red.
 * Cada tabla responde siempre con el dato indicado (o null si no se indica).
 * Ejemplo: mockSupabase({ roles: { level: 2 } })
 */
const fromOriginal = supabase.from;
const mockSupabase = (tablas = {}) => {
  supabase.from = (tabla) => {
    const resultado = { data: tablas[tabla] ?? null, error: null };
    const q = {
      select: () => q,
      eq: () => q,
      update: () => q,
      delete: () => q,
      insert: () => q,
      maybeSingle: async () => resultado,
      single: async () => resultado,
      then: (ok, fail) => Promise.resolve(resultado).then(ok, fail),
    };
    return q;
  };
};

// Guardamos los métodos del servicio para restaurarlos después de cada prueba
const servicioOriginal = { ...usuarioService };

afterEach(() => {
  supabase.from = fromOriginal;
  Object.assign(usuarioService, servicioOriginal);
});

const crearReq = ({ userId, nivel, body = {}, companyId = 'comp-1' }) => ({
  user: { id: userId },
  perfil: { rol: { nivel } },
  company_id: companyId,
  body,
});

// ---------------------------------------------------------------------------
// Pruebas
// ---------------------------------------------------------------------------
describe('HU-9: Administración de Usuarios', () => {

  describe('Agente - Sin permisos', () => {
    test('recibe 403 al intentar cambiar rol', async () => {
      mockSupabase(); // no pertenece a ningún grupo
      const req = crearReq({
        userId: 'user-agente', nivel: AGENTE,
        body: { userId: 'otro', groupId: 'group-1', roleId: 'rol-1' },
      });
      const res = await ejecutar(usuarioController.cambiarRol, req);
      assert.equal(res.statusCode, 403);
    });

    test('recibe 403 al intentar mover de grupo', async () => {
      mockSupabase();
      const req = crearReq({
        userId: 'user-agente', nivel: AGENTE,
        body: { userId: 'otro', oldGroupId: 'group-1', newGroupId: 'group-2' },
      });
      const res = await ejecutar(usuarioController.moverGrupo, req);
      assert.equal(res.statusCode, 403);
    });

    test('recibe 403 al intentar remover de grupo', async () => {
      mockSupabase();
      const req = crearReq({
        userId: 'user-agente', nivel: AGENTE,
        body: { userId: 'otro', groupId: 'group-1' },
      });
      const res = await ejecutar(usuarioController.removerGrupo, req);
      assert.equal(res.statusCode, 403);
    });

    test('recibe 403 al intentar eliminar de la empresa', async () => {
      const req = crearReq({
        userId: 'user-agente', nivel: AGENTE,
        body: { userId: 'otro' },
      });
      const res = await ejecutar(usuarioController.eliminarDeEmpresa, req);
      assert.equal(res.statusCode, 403);
    });
  });

  describe('Jefe de Área - Restricciones', () => {
    test('no puede asignar un rol superior al suyo (Administrador)', async () => {
      // El Jefe sí pertenece al grupo, y el rol destino es de nivel Administrador
      mockSupabase({
        user_group_role: { id: 'x', group_id: 'group-1' },
        roles: { level: ADMINISTRADOR },
      });
      const req = crearReq({
        userId: 'jefe-1', nivel: JEFE_AREA,
        body: { userId: 'user-1', groupId: 'group-1', roleId: 'rol-admin-id' },
      });
      const res = await ejecutar(usuarioController.cambiarRol, req);
      assert.equal(res.statusCode, 403);
      assert.ok(res.body.error.includes('rol superior'));
    });

    test('no puede cambiar el rol de un usuario fuera de su grupo', async () => {
      mockSupabase(); // el usuario destino no está en el grupo
      const req = crearReq({
        userId: 'jefe-1', nivel: JEFE_AREA,
        body: { userId: 'user-1', groupId: 'group-ajeno', roleId: 'rol-1' },
      });
      const res = await ejecutar(usuarioController.cambiarRol, req);
      assert.equal(res.statusCode, 403);
    });

    test('recibe 404 si el rol especificado no existe', async () => {
      mockSupabase({ user_group_role: { id: 'x', group_id: 'group-1' } }); // roles -> null
      const req = crearReq({
        userId: 'jefe-1', nivel: JEFE_AREA,
        body: { userId: 'user-1', groupId: 'group-1', roleId: 'rol-inexistente' },
      });
      const res = await ejecutar(usuarioController.cambiarRol, req);
      assert.equal(res.statusCode, 404);
    });

    test('no puede mover usuarios de un grupo que no gestiona', async () => {
      mockSupabase(); // no es miembro del grupo de origen
      const req = crearReq({
        userId: 'jefe-1', nivel: JEFE_AREA,
        body: { userId: 'user-1', oldGroupId: 'group-ajeno', newGroupId: 'group-2' },
      });
      const res = await ejecutar(usuarioController.moverGrupo, req);
      assert.equal(res.statusCode, 403);
    });

    test('no puede eliminar usuarios de la empresa', async () => {
      const req = crearReq({
        userId: 'jefe-1', nivel: JEFE_AREA,
        body: { userId: 'user-1' },
      });
      const res = await ejecutar(usuarioController.eliminarDeEmpresa, req);
      assert.equal(res.statusCode, 403);
    });
  });

  describe('Administrador - Reglas críticas', () => {
    test('no puede remover al último administrador de la empresa', async () => {
      usuarioService.verificarAdminUnico = async () => true;
      const req = crearReq({
        userId: 'admin-1', nivel: ADMINISTRADOR,
        body: { userId: 'admin-2', groupId: 'group-1' }, // otro usuario, no él mismo
      });
      const res = await ejecutar(usuarioController.removerGrupo, req);
      assert.equal(res.statusCode, 400);
      assert.ok(res.body.error.includes('último administrador'));
    });

    test('no puede bajar de rol al último administrador', async () => {
      usuarioService.verificarAdminUnico = async () => true;
      mockSupabase({ roles: { level: AGENTE } }); // el nuevo rol sería inferior
      const req = crearReq({
        userId: 'admin-1', nivel: ADMINISTRADOR,
        body: { userId: 'admin-2', groupId: 'group-1', roleId: 'rol-agente' },
      });
      const res = await ejecutar(usuarioController.cambiarRol, req);
      assert.equal(res.statusCode, 400);
      assert.ok(res.body.error.includes('último administrador'));
    });

    test('no puede cambiarse el rol a sí mismo', async () => {
      const req = crearReq({
        userId: 'admin-1', nivel: ADMINISTRADOR,
        body: { userId: 'admin-1', groupId: 'group-1', roleId: 'rol-1' },
      });
      const res = await ejecutar(usuarioController.cambiarRol, req);
      assert.equal(res.statusCode, 403);
      assert.ok(res.body.error.includes('propio rol'));
    });

    test('puede eliminar a un usuario de la empresa (200)', async () => {
      let llamadoCon = null;
      usuarioService.eliminarUsuarioDeEmpresa = async (userId, companyId) => {
        llamadoCon = { userId, companyId };
        return { success: true };
      };
      const req = crearReq({
        userId: 'admin-1', nivel: ADMINISTRADOR,
        body: { userId: 'user-1' },
      });
      const res = await ejecutar(usuarioController.eliminarDeEmpresa, req);
      assert.equal(res.statusCode ?? 200, 200);
      assert.deepEqual(llamadoCon, { userId: 'user-1', companyId: 'comp-1' });
    });
  });

  describe('Casos transversales', () => {
    test('eliminar sin userId responde 400', async () => {
      const req = crearReq({ userId: 'admin-1', nivel: ADMINISTRADOR, body: {} });
      const res = await ejecutar(usuarioController.eliminarDeEmpresa, req);
      assert.equal(res.statusCode, 400);
    });

    test('no puede eliminar su propia cuenta de la empresa', async () => {
      const req = crearReq({
        userId: 'admin-1', nivel: ADMINISTRADOR,
        body: { userId: 'admin-1' },
      });
      const res = await ejecutar(usuarioController.eliminarDeEmpresa, req);
      assert.equal(res.statusCode, 403);
      assert.ok(res.body.error.includes('propia cuenta'));
    });

    test('aislamiento por empresa: no elimina a un usuario de otra empresa', async () => {
      // El perfil existe pero pertenece a otra empresa
      mockSupabase({ profiles: { company_id: 'otra-empresa' } });
      const req = crearReq({
        userId: 'admin-1', nivel: ADMINISTRADOR,
        body: { userId: 'user-externo' },
      });
      const res = await ejecutar(usuarioController.eliminarDeEmpresa, req);
      // El controlador actual responde 500 con el mensaje del servicio
      assert.equal(res.statusCode, 500);
      assert.ok(res.body.error.includes('no pertenece'));
    });

    test('usuario inexistente: no se elimina nada', async () => {
      mockSupabase(); // profiles -> null
      const req = crearReq({
        userId: 'admin-1', nivel: ADMINISTRADOR,
        body: { userId: 'no-existe' },
      });
      const res = await ejecutar(usuarioController.eliminarDeEmpresa, req);
      assert.equal(res.statusCode, 500);
      assert.ok(res.body.error.includes('no pertenece'));
    });
  });
});