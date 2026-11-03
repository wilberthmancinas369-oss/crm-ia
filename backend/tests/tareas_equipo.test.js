// HU-13: el Jefe de Área ve, asigna, edita y elimina las tareas de su equipo.
// Pruebas por rol: Agente, Jefe de su grupo, Jefe de otro grupo y Administrador.
import { test, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { supabaseFalso } from './helpers/supabaseFalso.js';

process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';

const { default: supabase } = await import('../src/config/supabase.js');
const { perfilService } = await import('../src/services/perfil.service.js');
const { default: tareasRoutes } = await import('../src/routes/tareas.routes.js');
const { recordatoriosService } = await import('../src/services/recordatorios.service.js');

const uuid = (n) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const u = { agente: uuid(1), agente2: uuid(2), jefe1: uuid(3), jefe2: uuid(4), admin: uuid(5) };
const c = { g1: uuid(6), g2: uuid(7) };
const t = { propia: uuid(8), ajena: uuid(9), otroGrupo: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };

// Rol de cada usuario en cada grupo (nivel 0 Agente, 1 Jefe de Área, 2 Administrador)
const membresias = [
  [u.agente, 'grupo-1', 0], [u.agente2, 'grupo-1', 0], [u.jefe1, 'grupo-1', 1],
  [u.jefe2, 'grupo-2', 1], [u.admin, 'grupo-1', 2]
];
const comoUsuario = (id) => {
  perfilService.obtener = async () => ({
    usuario: { id }, empresa: { id: 'empresa-1' },
    grupos: membresias.filter(([usuario]) => usuario === id).map(([, grupo, nivel]) => ({ id: grupo, nivel }))
  });
};

const enHoras = (horas) => new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();
const tarea = (id, responsable, contacto, extra = {}) => ({
  id, company_id: 'empresa-1', titulo: `Tarea ${id.slice(0, 4)}`, estado: 'Pendiente',
  fecha_limite: enHoras(72), responsable_id: responsable, contacto_id: contacto, oportunidad_id: null,
  recordatorio_enviado_at: null, ...extra
});

let tablas, server, baseUrl;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/tareas', tareasRoutes);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/tareas`;
});
after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

beforeEach(() => {
  tablas = {
    profiles: Object.entries(u).map(([nombre, id]) => ({
      id, company_id: 'empresa-1', full_name: nombre, email: `${nombre}@example.test`
    })),
    contactos: [
      { id: c.g1, company_id: 'empresa-1', group_id: 'grupo-1', nombre: 'Ana', apellido: 'Uno' },
      { id: c.g2, company_id: 'empresa-1', group_id: 'grupo-2', nombre: 'Beto', apellido: 'Dos' }
    ],
    oportunidades: [],
    tareas: [
      tarea(t.propia, u.agente, c.g1),
      tarea(t.ajena, u.agente2, c.g1),
      tarea(t.otroGrupo, u.jefe2, c.g2)
    ],
    user_group_role: membresias.map(([user_id, group_id, level]) => ({
      user_id, group_id, company_id: 'empresa-1', roles: { level }
    }))
  };
  supabase.from = supabaseFalso(tablas);
  supabase.auth.getUser = async () => ({ data: { user: { id: u.agente } }, error: null });
  comoUsuario(u.agente);
});

async function pedir(method, ruta = '', body) {
  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-de-prueba' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const texto = await respuesta.text();
  return { status: respuesta.status, body: texto ? JSON.parse(texto) : null };
}
const buscar = (id) => tablas.tareas.find((fila) => fila.id === id);

// ---------- Tareas del equipo ----------

test('Agente: no ve las tareas del equipo', async () => {
  assert.equal((await pedir('GET', '/equipo')).status, 403);
});

test('Jefe de su grupo: ve las tareas de todos los miembros de su grupo con su responsable', async () => {
  comoUsuario(u.jefe1);
  const respuesta = await pedir('GET', '/equipo');
  assert.equal(respuesta.status, 200);
  assert.deepEqual(respuesta.body.map((fila) => fila.id).sort(), [t.propia, t.ajena].sort());
  const propia = respuesta.body.find((fila) => fila.id === t.propia);
  assert.deepEqual(propia.responsable, { id: u.agente, nombre: 'agente', email: 'agente@example.test' });
  assert.equal(propia.group_id, 'grupo-1');
  assert.equal(propia.contactos.nombre, 'Ana');
});

test('Jefe de otro grupo: solo ve las de su grupo', async () => {
  comoUsuario(u.jefe2);
  const respuesta = await pedir('GET', '/equipo');
  assert.equal(respuesta.status, 200);
  assert.deepEqual(respuesta.body.map((fila) => fila.id), [t.otroGrupo]);
});

test('Administrador: ve las tareas de toda la empresa, pero no las de otra empresa', async () => {
  tablas.tareas.push({ ...tarea(uuid(0), u.agente, c.g1), company_id: 'empresa-2' });
  comoUsuario(u.admin);
  const respuesta = await pedir('GET', '/equipo');
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.length, 3);
});

// ---------- Asignar / reasignar ----------

test('Agente: no puede asignar ni reasignar, ni siquiera su propia tarea', async () => {
  for (const id of [t.propia, t.ajena]) {
    assert.equal((await pedir('PATCH', `/${id}/asignar`, { responsable_id: u.agente2 })).status, 403);
  }
  assert.equal(buscar(t.propia).responsable_id, u.agente);
});

test('Jefe de su grupo: reasigna a un miembro del grupo y reinicia el recordatorio', async () => {
  comoUsuario(u.jefe1);
  buscar(t.propia).recordatorio_enviado_at = '2026-10-01T00:00:00Z';
  const respuesta = await pedir('PATCH', `/${t.propia}/asignar`, { responsable_id: u.agente2 });
  assert.equal(respuesta.status, 200);
  assert.equal(buscar(t.propia).responsable_id, u.agente2);
  assert.equal(buscar(t.propia).recordatorio_enviado_at, null);
});

test('Jefe de su grupo: no asigna a alguien de otro grupo ni a un UUID inválido', async () => {
  comoUsuario(u.jefe1);
  assert.equal((await pedir('PATCH', `/${t.propia}/asignar`, { responsable_id: u.jefe2 })).status, 400);
  assert.equal((await pedir('PATCH', `/${t.propia}/asignar`, { responsable_id: 'abc' })).status, 400);
  assert.equal((await pedir('PATCH', `/${t.propia}/asignar`, {})).status, 400);
  assert.equal(buscar(t.propia).responsable_id, u.agente);
});

test('Jefe de otro grupo: no encuentra las tareas del grupo ajeno', async () => {
  comoUsuario(u.jefe2);
  assert.equal((await pedir('PATCH', `/${t.propia}/asignar`, { responsable_id: u.jefe2 })).status, 404);
  assert.equal(buscar(t.propia).responsable_id, u.agente);
});

test('Administrador: asigna a un miembro del grupo o a sí mismo, no a otro grupo', async () => {
  comoUsuario(u.admin);
  assert.equal((await pedir('PATCH', `/${t.propia}/asignar`, { responsable_id: u.agente2 })).status, 200);
  assert.equal((await pedir('PATCH', `/${t.ajena}/asignar`, { responsable_id: u.admin })).status, 200);
  assert.equal(buscar(t.ajena).responsable_id, u.admin);
  assert.equal((await pedir('PATCH', `/${t.otroGrupo}/asignar`, { responsable_id: u.agente })).status, 400);
});

// ---------- Editar ----------

test('Agente: edita su tarea pero no la de un compañero', async () => {
  assert.equal((await pedir('PUT', `/${t.propia}`, { titulo: 'Mía' })).status, 200);
  const ajena = await pedir('PUT', `/${t.ajena}`, { titulo: 'Ajena' });
  assert.equal(ajena.status, 403);
  assert.notEqual(buscar(t.ajena).titulo, 'Ajena');
  assert.equal((await pedir('PATCH', `/${t.ajena}/completar`)).status, 403);
  assert.equal(buscar(t.ajena).estado, 'Pendiente');
});

test('Jefe de su grupo: edita y completa tareas de su equipo', async () => {
  comoUsuario(u.jefe1);
  const respuesta = await pedir('PUT', `/${t.ajena}`, { titulo: 'Revisada', estado: 'En progreso' });
  assert.equal(respuesta.status, 200);
  assert.equal(buscar(t.ajena).titulo, 'Revisada');
  assert.equal((await pedir('PATCH', `/${t.ajena}/completar`)).status, 200);
});

test('Jefe de otro grupo: no edita tareas del grupo ajeno', async () => {
  comoUsuario(u.jefe2);
  assert.equal((await pedir('PUT', `/${t.ajena}`, { titulo: 'Intruso' })).status, 404);
  assert.notEqual(buscar(t.ajena).titulo, 'Intruso');
});

test('Administrador: edita tareas de cualquier grupo', async () => {
  comoUsuario(u.admin);
  assert.equal((await pedir('PUT', `/${t.otroGrupo}`, { titulo: 'Desde admin' })).status, 200);
  assert.equal(buscar(t.otroGrupo).titulo, 'Desde admin');
});

// ---------- Eliminar ----------

test('Agente: elimina su tarea pero no la de un compañero', async () => {
  assert.equal((await pedir('DELETE', `/${t.ajena}`)).status, 403);
  assert.ok(buscar(t.ajena));
  assert.equal((await pedir('DELETE', `/${t.propia}`)).status, 204);
  assert.equal(buscar(t.propia), undefined);
});

test('Jefe de su grupo: elimina tareas de su equipo; repetir responde 404', async () => {
  comoUsuario(u.jefe1);
  assert.equal((await pedir('DELETE', `/${t.ajena}`)).status, 204);
  assert.equal((await pedir('DELETE', `/${t.ajena}`)).status, 404);
  assert.equal(tablas.tareas.length, 2);
});

test('Jefe de otro grupo: no elimina tareas del grupo ajeno', async () => {
  comoUsuario(u.jefe2);
  assert.equal((await pedir('DELETE', `/${t.ajena}`)).status, 404);
  assert.equal(tablas.tareas.length, 3);
});

test('Administrador: elimina tareas de cualquier grupo; valida el UUID', async () => {
  comoUsuario(u.admin);
  assert.equal((await pedir('DELETE', `/${t.otroGrupo}`)).status, 204);
  assert.equal((await pedir('DELETE', '/incorrecto')).status, 400);
  assert.equal(tablas.tareas.length, 2);
});

// ---------- Recordatorio de 24 h al nuevo responsable ----------

function simularBrevo(prueba, activos = 'true') {
  const variables = ['RECORDATORIOS_ACTIVOS', 'BREVO_API_KEY', 'BREVO_SENDER_EMAIL'];
  const anteriores = Object.fromEntries(variables.map((clave) => [clave, process.env[clave]]));
  Object.assign(process.env, {
    RECORDATORIOS_ACTIVOS: activos, BREVO_API_KEY: 'clave-ficticia', BREVO_SENDER_EMAIL: 'crm@example.test'
  });
  const correos = [];
  const fetchOriginal = globalThis.fetch;
  const transporte = mock.method(globalThis, 'fetch', async (url, opciones) => {
    if (url !== 'https://api.brevo.com/v3/smtp/email') return fetchOriginal(url, opciones);
    correos.push(JSON.parse(opciones.body));
    return { ok: true, json: async () => ({ messageId: `correo-${correos.length}` }) };
  });
  prueba.after(() => {
    transporte.mock.restore();
    for (const clave of variables) {
      if (anteriores[clave] === undefined) delete process.env[clave];
      else process.env[clave] = anteriores[clave];
    }
  });
  return correos;
}

test('al reasignar una tarea que vence en menos de 24 h, el aviso le llega al nuevo responsable', async (prueba) => {
  const correos = simularBrevo(prueba);
  const propia = buscar(t.propia);
  propia.fecha_limite = enHoras(5);
  // El responsable anterior ya había recibido su recordatorio
  await recordatoriosService.enviarPendientes();
  assert.deepEqual(correos.map((correo) => correo.to[0].email), ['agente@example.test']);

  comoUsuario(u.jefe1);
  assert.equal((await pedir('PATCH', `/${t.propia}/asignar`, { responsable_id: u.agente2 })).status, 200);
  assert.deepEqual(correos.map((correo) => correo.to[0].email), ['agente@example.test', 'agente2@example.test']);
  assert.ok(buscar(t.propia).recordatorio_enviado_at, 'Queda marcado para no repetirlo');
  await recordatoriosService.enviarPendientes();
  assert.equal(correos.length, 2, 'La revisión periódica no lo duplica');
});

test('reasignar con PUT (editar) también avisa al nuevo responsable', async (prueba) => {
  const correos = simularBrevo(prueba);
  buscar(t.propia).fecha_limite = enHoras(3);
  comoUsuario(u.jefe1);
  assert.equal((await pedir('PUT', `/${t.propia}`, { responsable_id: u.agente2 })).status, 200);
  assert.deepEqual(correos.map((correo) => correo.to[0].email), ['agente2@example.test']);
});

test('si la tarea vence en más de 24 h no avisa todavía; la revisión periódica lo hará después', async (prueba) => {
  const correos = simularBrevo(prueba);
  // Las demás tareas vencen mucho después, para que solo cuente la reasignada
  for (const id of [t.ajena, t.otroGrupo]) buscar(id).fecha_limite = enHoras(500);
  comoUsuario(u.jefe1);
  assert.equal((await pedir('PATCH', `/${t.propia}/asignar`, { responsable_id: u.agente2 })).status, 200);
  assert.equal(correos.length, 0);
  assert.equal(buscar(t.propia).recordatorio_enviado_at, null);
  // Un día y medio después ya entra en la ventana de 24 h y el aviso va al nuevo responsable
  await recordatoriosService.enviarPendientes(new Date(Date.now() + 50 * 60 * 60 * 1000));
  assert.deepEqual(correos.map((correo) => correo.to[0].email), ['agente2@example.test']);
});

test('con los recordatorios desactivados, reasignar no envía correos', async (prueba) => {
  const correos = simularBrevo(prueba, 'false');
  buscar(t.propia).fecha_limite = enHoras(5);
  comoUsuario(u.jefe1);
  assert.equal((await pedir('PATCH', `/${t.propia}/asignar`, { responsable_id: u.agente2 })).status, 200);
  assert.equal(correos.length, 0);
});

test('no avisa de tareas completadas al reasignarlas', async (prueba) => {
  const correos = simularBrevo(prueba);
  Object.assign(buscar(t.propia), { fecha_limite: enHoras(5), estado: 'Completada' });
  comoUsuario(u.jefe1);
  assert.equal((await pedir('PATCH', `/${t.propia}/asignar`, { responsable_id: u.agente2 })).status, 200);
  assert.equal(correos.length, 0);
});
