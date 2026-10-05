import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Valores ficticios para que config/supabase.js no aborte; ninguna prueba sale a la red
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';

const { NIVELES, PERMISOS, permisosDelNivel } = await import('../src/config/permisos.js');
const { perfilService } = await import('../src/services/perfil.service.js');
const { autorizarRol } = await import('../src/middlewares/autorizarRol.js');

const perfilCon = (nivel) => ({
  usuario: { id: 'user-1', nombre: 'Ana', email: 'ana@test.com' },
  empresa: { id: 'company-1', nombre: 'Empresa Uno' },
  rol: { nombre: 'Rol', nivel },
  grupos: [],
  permisos: permisosDelNivel(nivel)
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

describe('permisosDelNivel', () => {
  test('un Agente gestiona el CRM pero no invita ni crea grupos', () => {
    assert.deepEqual(permisosDelNivel(NIVELES.AGENTE), {
      gestionarCRM: true, verGrupos: true, verMiembros: false, invitarUsuarios: false, crearGrupos: false
    });
  });

  test('un Administrador tiene todos los permisos (herencia)', () => {
    const permisos = permisosDelNivel(NIVELES.ADMINISTRADOR);
    assert.ok(Object.keys(PERMISOS).every((p) => permisos[p] === true));
  });
});

describe('autorizarRol', () => {
  beforeEach(() => {
    perfilService.obtener = async () => perfilCon(NIVELES.AGENTE);
  });

  test('sin usuario responde 401', async () => {
    const { res, siguio } = await ejecutar(autorizarRol(0), {});
    assert.equal(res.statusCode, 401);
    assert.equal(siguio, false);
  });

  test('sin perfil (no pertenece a una empresa) responde 403', async () => {
    perfilService.obtener = async () => null;
    const { res, siguio } = await ejecutar(autorizarRol(0), { user: { id: 'user-1' } });
    assert.equal(res.statusCode, 403);
    assert.equal(siguio, false);
  });

  test('con nivel insuficiente responde 403', async () => {
    const { res, siguio } = await ejecutar(autorizarRol(PERMISOS.invitarUsuarios), { user: { id: 'user-1' } });
    assert.equal(res.statusCode, 403);
    assert.equal(siguio, false);
  });

  test('con nivel suficiente deja la empresa del perfil en req.company_id', async () => {
    const req = { user: { id: 'user-1' } };
    const { siguio } = await ejecutar(autorizarRol(PERMISOS.gestionarCRM), req);
    assert.equal(siguio, true);
    assert.equal(req.company_id, 'company-1');
  });
});
