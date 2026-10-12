import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Valores ficticios para que config/supabase.js no aborte; ninguna prueba sale a la red
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';

const { NIVELES, PERMISOS, resumenPermisos } = await import('../src/config/permisos.js');
const { perfilService } = await import('../src/services/perfil.service.js');
const { autorizar } = await import('../src/middlewares/autorizarRol.js');

// Perfil con un rol por grupo: perfilCon([['g1', NIVELES.AGENTE]])
const perfilCon = (grupos) => ({
  usuario: { id: 'user-1', nombre: 'Ana', email: 'ana@test.com' },
  empresa: { id: 'company-1', nombre: 'Empresa Uno' },
  grupos: grupos.map(([id, nivel]) => ({ id, nombre: id, rol: 'Rol', nivel }))
});

const mockRes = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

// Ejecuta el middleware y regresa la respuesta y si llamó a next()
const ejecutar = async (middleware, req) => {
  const res = mockRes();
  let siguio = false;
  await middleware(req, res, () => { siguio = true; });
  return { res, siguio };
};

describe('resumenPermisos', () => {
  test('un Agente gestiona el CRM pero no invita, no ve miembros ni crea grupos', () => {
    const permisos = resumenPermisos(perfilCon([['g1', NIVELES.AGENTE]]));
    assert.equal(permisos.gestionarCRM, true);
    assert.equal(permisos.verMiembros, false);
    assert.equal(permisos.invitarUsuarios, false);
    assert.equal(permisos.crearGrupos, false);
  });

  test('un Administrador tiene todos los permisos (herencia)', () => {
    const permisos = resumenPermisos(perfilCon([['g1', NIVELES.ADMINISTRADOR]]));
    assert.ok(Object.keys(PERMISOS).every((p) => permisos[p] === true));
  });
});

describe('autorizar', () => {
  beforeEach(() => {
    perfilService.obtener = async () => perfilCon([['g1', NIVELES.AGENTE]]);
  });

  test('sin usuario responde 401', async () => {
    const { res, siguio } = await ejecutar(autorizar('gestionarCRM'), {});
    assert.equal(res.statusCode, 401);
    assert.equal(siguio, false);
  });

  test('sin perfil (no pertenece a una empresa) responde 403', async () => {
    perfilService.obtener = async () => null;
    const { res, siguio } = await ejecutar(autorizar('gestionarCRM'), { user: { id: 'user-1' } });
    assert.equal(res.statusCode, 403);
    assert.equal(siguio, false);
  });

  test('sin el permiso en ningún grupo responde 403', async () => {
    const { res, siguio } = await ejecutar(autorizar('invitarUsuarios'), { user: { id: 'user-1' } });
    assert.equal(res.statusCode, 403);
    assert.equal(siguio, false);
  });

  test('con el permiso deja la empresa en req.company_id y sus grupos en req.alcance', async () => {
    const req = { user: { id: 'user-1' } };
    const { siguio } = await ejecutar(autorizar('gestionarCRM'), req);
    assert.equal(siguio, true);
    assert.equal(req.company_id, 'company-1');
    assert.deepEqual(req.alcance, ['g1']);
  });
});
