import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Valores ficticios para que config/supabase.js no aborte; ninguna prueba sale a la red
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';

const { default: supabase } = await import('../src/config/supabase.js');
const { aceptarInvitacion, obtenerInvitacion } = await import('../src/controllers/invitaciones.controller.js');

const TOKEN = 'a'.repeat(64);
const EN_UNA_SEMANA = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

const invitacionPendiente = (cambios = {}) => ({
  id: 'inv-1',
  email: 'nuevo@empresa.com',
  status: 'pendiente',
  expires_at: EN_UNA_SEMANA,
  companies: { name: 'Empresa Uno' },
  groups: { name: 'Ventas' },
  roles: { name: 'Agente' },
  ...cambios
});

// Simula from('invitations').select().eq().maybeSingle() y .update().eq()
const mockFrom = (invitacion) => () => {
  const consulta = {
    select: () => consulta,
    update: () => consulta,
    eq: () => consulta,
    maybeSingle: async () => ({ data: invitacion, error: null }),
    then: (resolver) => resolver({ data: null, error: null }) // await de update().eq()
  };
  return consulta;
};

const mockRes = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const reqAceptar = () => ({ params: { token: TOKEN }, body: { nombre: 'Luis Pérez', password: 'clave1234' } });

let llamadas;

beforeEach(() => {
  llamadas = { createUser: null, rpc: null, deleteUser: null };
  supabase.from = mockFrom(invitacionPendiente());
  supabase.auth.admin.createUser = async (datos) => {
    llamadas.createUser = datos;
    return { data: { user: { id: 'user-nuevo' } }, error: null };
  };
  supabase.auth.admin.deleteUser = async (id) => {
    llamadas.deleteUser = id;
    return { data: null, error: null };
  };
  supabase.rpc = async (nombre, args) => {
    llamadas.rpc = { nombre, args };
    return { data: 'company-1', error: null };
  };
});

describe('GET /api/invitaciones/:token', () => {
  test('devuelve empresa, grupo y rol de una invitación pendiente', async () => {
    const res = mockRes();
    await obtenerInvitacion({ params: { token: TOKEN } }, res);
    assert.equal(res.statusCode, undefined); // res.json directo = 200
    assert.deepEqual(
      { email: res.body.email, empresa: res.body.empresa, grupo: res.body.grupo, rol: res.body.rol },
      { email: 'nuevo@empresa.com', empresa: 'Empresa Uno', grupo: 'Ventas', rol: 'Agente' }
    );
  });

  test('responde 410 si la invitación ya venció', async () => {
    supabase.from = mockFrom(invitacionPendiente({ expires_at: '2020-01-01T00:00:00Z' }));
    const res = mockRes();
    await obtenerInvitacion({ params: { token: TOKEN } }, res);
    assert.equal(res.statusCode, 410);
  });

  test('responde 409 si la invitación ya fue aceptada', async () => {
    supabase.from = mockFrom(invitacionPendiente({ status: 'aceptada' }));
    const res = mockRes();
    await obtenerInvitacion({ params: { token: TOKEN } }, res);
    assert.equal(res.statusCode, 409);
  });
});

describe('POST /api/invitaciones/:token/aceptar', () => {
  test('crea la cuenta confirmada con el correo de la invitación y la asocia a su grupo y rol', async () => {
    const res = mockRes();
    await aceptarInvitacion(reqAceptar(), res);

    assert.equal(res.statusCode, 201);
    assert.equal(llamadas.createUser.email, 'nuevo@empresa.com');
    assert.equal(llamadas.createUser.email_confirm, true);
    assert.deepEqual(llamadas.rpc, {
      nombre: 'aceptar_invitacion',
      args: { p_token: TOKEN, p_user_id: 'user-nuevo', p_nombre: 'Luis Pérez' }
    });
    assert.equal(llamadas.deleteUser, null);
  });

  test('no crea la cuenta si la invitación ya venció', async () => {
    supabase.from = mockFrom(invitacionPendiente({ expires_at: '2020-01-01T00:00:00Z' }));
    const res = mockRes();
    await aceptarInvitacion(reqAceptar(), res);

    assert.equal(res.statusCode, 410);
    assert.equal(llamadas.createUser, null);
  });

  test('responde 409 si el correo ya tiene cuenta', async () => {
    supabase.auth.admin.createUser = async () => ({ data: { user: null }, error: { code: 'email_exists' } });
    const res = mockRes();
    await aceptarInvitacion(reqAceptar(), res);

    assert.equal(res.statusCode, 409);
    assert.equal(llamadas.rpc, null);
  });

  test('borra la cuenta recién creada si falla la asignación de grupo y rol', async () => {
    supabase.rpc = async () => ({ data: null, error: { message: 'INVITACION_INVALIDA' } });
    const res = mockRes();
    await aceptarInvitacion(reqAceptar(), res);

    assert.equal(res.statusCode, 409);
    assert.equal(llamadas.deleteUser, 'user-nuevo');
  });
});
