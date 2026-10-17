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

const ids = {
  responsable: '11111111-1111-4111-8111-111111111111',
  contacto: '22222222-2222-4222-8222-222222222222',
  oportunidad: '33333333-3333-4333-8333-333333333333',
  tarea: '44444444-4444-4444-8444-444444444444',
  otro: '55555555-5555-4555-8555-555555555555'
};
const nuevaTarea = () => ({
  titulo: 'Llamar al contacto', fecha_limite: '2026-10-20T15:00:00-07:00',
  responsable_id: ids.responsable, contacto_id: ids.contacto
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
    profiles: [{ id: ids.responsable, company_id: 'empresa-1' }],
    contactos: [{ id: ids.contacto, company_id: 'empresa-1', group_id: 'grupo-1' }],
    oportunidades: [{ id: ids.oportunidad, company_id: 'empresa-1', group_id: 'grupo-1' }],
    tareas: [{ id: ids.tarea, company_id: 'empresa-1', ...nuevaTarea(), estado: 'Pendiente' }]
  };
  supabase.from = supabaseFalso(tablas);
  supabase.auth.getUser = async () => ({ data: { user: { id: ids.responsable } }, error: null });
  perfilService.obtener = async () => ({
    usuario: { id: ids.responsable }, empresa: { id: 'empresa-1' },
    grupos: [{ id: 'grupo-1', nivel: 0 }]
  });
});

async function pedir(method, ruta = '', body, autenticado = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (autenticado) headers.Authorization = 'Bearer token-de-prueba';
  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { status: respuesta.status, body: await respuesta.json() };
}

test('crea con estado inicial y toma la empresa de la sesión, ignorando campos internos', async () => {
  const respuesta = await pedir('POST', '', {
    ...nuevaTarea(), company_id: 'empresa-ajena', id: ids.otro, created_at: '2000-01-01'
  });
  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.company_id, 'empresa-1');
  assert.equal(respuesta.body.estado, 'Pendiente');
  assert.notEqual(respuesta.body.id, ids.otro);
  assert.equal(respuesta.body.created_at, undefined);
});

test('crea una tarea ligada únicamente a una oportunidad', async () => {
  const datos = nuevaTarea();
  delete datos.contacto_id;
  const respuesta = await pedir('POST', '', { ...datos, oportunidad_id: ids.oportunidad });
  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.oportunidad_id, ids.oportunidad);
});

for (const [nombre, cambios] of [
  ['título vacío', { titulo: '   ' }],
  ['fecha inexistente', { fecha_limite: '2026-02-30' }],
  ['fecha nula', { fecha_limite: null }],
  ['responsable inválido', { responsable_id: 'abc' }],
  ['estado inválido', { estado: 'Cancelada' }],
  ['dos vínculos', { oportunidad_id: ids.oportunidad }],
  ['sin vínculo', { contacto_id: null }]
]) {
  test(`rechaza ${nombre} sin insertar`, async () => {
    const respuesta = await pedir('POST', '', { ...nuevaTarea(), ...cambios });
    assert.equal(respuesta.status, 400);
    assert.equal(tablas.tareas.length, 1);
  });
}

test('exige título, fecha y responsable al crear', async () => {
  const respuesta = await pedir('POST', '', { contacto_id: ids.contacto });
  assert.equal(respuesta.status, 400);
  assert.equal(respuesta.body.errors.length, 3);
});

test('rechaza un responsable de otra empresa', async () => {
  tablas.profiles[0].company_id = 'empresa-2';
  assert.equal((await pedir('POST', '', nuevaTarea())).status, 400);
});

test('no permite crear con un contacto fuera del grupo', async () => {
  tablas.contactos[0].group_id = 'grupo-2';
  assert.equal((await pedir('POST', '', nuevaTarea())).status, 404);
});

test('edita solo los campos enviados y conserva los demás', async () => {
  const respuesta = await pedir('PUT', `/${ids.tarea}`, { titulo: 'Nuevo título', company_id: 'empresa-2' });
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.titulo, 'Nuevo título');
  assert.equal(respuesta.body.fecha_limite, nuevaTarea().fecha_limite);
  assert.equal(respuesta.body.company_id, 'empresa-1');
});

test('permite cambiar el vínculo de contacto a oportunidad enviando null', async () => {
  const respuesta = await pedir('PUT', `/${ids.tarea}`, {
    contacto_id: null, oportunidad_id: ids.oportunidad
  });
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.contacto_id, null);
  assert.equal(respuesta.body.oportunidad_id, ids.oportunidad);
});

test('valida el resultado de editar: no permite dos vínculos ni vaciar el único', async () => {
  assert.equal((await pedir('PUT', `/${ids.tarea}`, { oportunidad_id: ids.oportunidad })).status, 400);
  assert.equal((await pedir('PUT', `/${ids.tarea}`, { contacto_id: null })).status, 400);
  assert.equal(tablas.tareas[0].contacto_id, ids.contacto);
});

test('rechaza editar sin campos reconocidos', async () => {
  assert.equal((await pedir('PUT', `/${ids.tarea}`, { company_id: 'empresa-2' })).status, 400);
});

test('no permite mover una tarea a una oportunidad fuera de su alcance', async () => {
  tablas.oportunidades[0].group_id = 'grupo-2';
  assert.equal((await pedir('PUT', `/${ids.tarea}`, {
    contacto_id: null, oportunidad_id: ids.oportunidad
  })).status, 404);
  assert.equal(tablas.tareas[0].contacto_id, ids.contacto);
});

test('completa sin cuerpo y repetir la petición conserva el estado', async () => {
  for (let i = 0; i < 2; i++) {
    const respuesta = await pedir('PATCH', `/${ids.tarea}/completar`);
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.estado, 'Completada');
    assert.equal(respuesta.body.titulo, nuevaTarea().titulo);
  }
});

for (const caso of ['inexistente', 'otra empresa', 'otro grupo']) {
  test(`no permite editar ni completar una tarea de ${caso}`, async () => {
    if (caso === 'inexistente') tablas.tareas = [];
    if (caso === 'otra empresa') tablas.tareas[0].company_id = 'empresa-2';
    if (caso === 'otro grupo') tablas.contactos[0].group_id = 'grupo-2';
    assert.equal((await pedir('PUT', `/${ids.tarea}`, { titulo: 'Cambio' })).status, 404);
    assert.equal((await pedir('PATCH', `/${ids.tarea}/completar`)).status, 404);
    if (tablas.tareas.length) assert.equal(tablas.tareas[0].estado, 'Pendiente');
  });
}

test('valida el UUID de la tarea', async () => {
  assert.equal((await pedir('PUT', '/incorrecto', { titulo: 'Cambio' })).status, 400);
  assert.equal((await pedir('PATCH', '/incorrecto/completar')).status, 400);
});

test('las tres rutas exigen sesión', async () => {
  assert.equal((await pedir('POST', '', nuevaTarea(), false)).status, 401);
  assert.equal((await pedir('PUT', `/${ids.tarea}`, { titulo: 'Cambio' }, false)).status, 401);
  assert.equal((await pedir('PATCH', `/${ids.tarea}/completar`, undefined, false)).status, 401);
});

test('sin permiso responde 403', async () => {
  perfilService.obtener = async () => ({ empresa: { id: 'empresa-1' }, grupos: [] });
  assert.equal((await pedir('POST', '', nuevaTarea())).status, 403);
});

test('propaga los errores de base de datos como 500', async () => {
  supabase.from = () => { throw new Error('Fallo de base de datos'); };
  const respuesta = await pedir('PATCH', `/${ids.tarea}/completar`);
  assert.equal(respuesta.status, 500);
  assert.equal(respuesta.body.error, 'Fallo de base de datos');
});

test('Mis tareas reúne ambos vínculos, ordena por fecha y excluye otros responsables, empresas y grupos', async () => {
  tablas.contactos.push({ id: ids.otro, company_id: 'empresa-1', group_id: 'grupo-2' });
  tablas.tareas.push(
    { ...tablas.tareas[0], id: 'oportunidad', contacto_id: null, oportunidad_id: ids.oportunidad, fecha_limite: '2026-10-19T10:00:00Z' },
    { ...tablas.tareas[0], id: 'otro-responsable', responsable_id: ids.otro },
    { ...tablas.tareas[0], id: 'otra-empresa', company_id: 'empresa-2' },
    { ...tablas.tareas[0], id: 'otro-grupo', contacto_id: ids.otro }
  );
  const respuesta = await pedir('GET', `?responsable_id=${ids.otro}&company_id=empresa-2`);
  assert.equal(respuesta.status, 200);
  assert.deepEqual(respuesta.body.map((tarea) => tarea.id), ['oportunidad', ids.tarea]);
  assert.equal(respuesta.body[1].contactos.id, ids.contacto);
});

test('el administrador también ve solamente sus tareas, con alcance en todos los grupos de su empresa', async () => {
  perfilService.obtener = async () => ({ empresa: { id: 'empresa-1' }, grupos: [{ id: 'grupo-1', nivel: 2 }] });
  tablas.contactos[0].group_id = 'grupo-2';
  tablas.tareas.push({ ...tablas.tareas[0], id: 'otro', responsable_id: ids.otro });
  const respuesta = await pedir('GET');
  assert.equal(respuesta.status, 200);
  assert.deepEqual(respuesta.body.map((tarea) => tarea.id), [ids.tarea]);
});

test('Mis tareas devuelve lista vacía si no hay asignadas y exige sesión', async () => {
  tablas.tareas = [];
  const respuesta = await pedir('GET');
  assert.equal(respuesta.status, 200);
  assert.deepEqual(respuesta.body, []);
  assert.equal((await pedir('GET', '', undefined, false)).status, 401);
});

test('editar fecha o responsable reinicia el recordatorio; otros cambios conservan la marca', async () => {
  tablas.tareas[0].recordatorio_enviado_at = '2026-10-19T10:00:00Z';
  const editarTitulo = await pedir('PUT', `/${ids.tarea}`, { titulo: 'Otro título', recordatorio_enviado_at: null });
  assert.equal(editarTitulo.status, 200);
  assert.equal(editarTitulo.body.recordatorio_enviado_at, '2026-10-19T10:00:00Z');
  const editarFecha = await pedir('PUT', `/${ids.tarea}`, { fecha_limite: '2026-10-22T15:00:00-07:00' });
  assert.equal(editarFecha.status, 200);
  assert.equal(editarFecha.body.recordatorio_enviado_at, null);
  tablas.tareas[0].recordatorio_enviado_at = '2026-10-19T10:00:00Z';
  tablas.profiles.push({ id: ids.otro, company_id: 'empresa-1' });
  const reasignar = await pedir('PUT', `/${ids.tarea}`, { responsable_id: ids.otro });
  assert.equal(reasignar.status, 200);
  assert.equal(reasignar.body.recordatorio_enviado_at, null);
});

// Flujo integrado: rutas HTTP, servicios, consulta de vencimientos y formato real
// del correo. Solo Supabase y la respuesta externa de Brevo están simulados.
for (const tipo of ['contacto', 'oportunidad']) {
  test(`flujo completo con ${tipo}: alta → consulta → edición → recordatorio → reprogramación → completar`, async (t) => {
    tablas.tareas = [];
    tablas.profiles[0].email = 'responsable@example.test';
    const variables = ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'FRONTEND_URL'];
    const anteriores = Object.fromEntries(variables.map((clave) => [clave, process.env[clave]]));
    process.env.BREVO_API_KEY = 'clave-ficticia';
    process.env.BREVO_SENDER_EMAIL = 'crm@example.test';
    process.env.FRONTEND_URL = 'https://crm.example.test';
    const correos = [];
    const fetchOriginal = globalThis.fetch;
    const transporte = mock.method(globalThis, 'fetch', async (url, opciones) => {
      if (url !== 'https://api.brevo.com/v3/smtp/email') return fetchOriginal(url, opciones);
      correos.push(JSON.parse(opciones.body));
      return { ok: true, json: async () => ({ messageId: `correo-${correos.length}` }) };
    });
    t.after(() => {
      transporte.mock.restore();
      for (const clave of variables) {
        if (anteriores[clave] === undefined) delete process.env[clave];
        else process.env[clave] = anteriores[clave];
      }
    });

    const ahora = new Date('2026-10-20T12:00:00.000Z');
    const vinculo = tipo === 'contacto' ? { contacto_id: ids.contacto } : { oportunidad_id: ids.oportunidad };
    const creada = await pedir('POST', '', {
      titulo: `Seguimiento de ${tipo}`, fecha_limite: '2026-10-22T12:00:00.000Z',
      responsable_id: ids.responsable, ...vinculo
    });
    assert.equal(creada.status, 201);
    assert.equal(creada.body.estado, 'Pendiente');
    const id = creada.body.id;
    const listado = await pedir('GET');
    assert.equal(listado.status, 200);
    assert.deepEqual(listado.body.map((fila) => fila.id), [id]);

    await recordatoriosService.enviarPendientes(ahora);
    assert.equal(correos.length, 0, 'No avisa con más de 24 horas de anticipación');
    const editada = await pedir('PUT', `/${id}`, {
      titulo: 'Confirmar seguimiento', estado: 'En progreso', fecha_limite: '2026-10-21T11:00:00.000Z'
    });
    assert.equal(editada.status, 200);
    assert.equal(editada.body.estado, 'En progreso');
    await recordatoriosService.enviarPendientes(ahora);
    await recordatoriosService.enviarPendientes(ahora);
    assert.equal(correos.length, 1, 'Solo envía un recordatorio por vencimiento');
    assert.equal(correos[0].to[0].email, 'responsable@example.test');
    assert.equal(correos[0].subject, 'Recordatorio de vencimiento: Confirmar seguimiento');
    assert.ok(correos[0].htmlContent.includes('https://crm.example.test/app/tareas'));

    const reprogramada = await pedir('PUT', `/${id}`, { fecha_limite: '2026-10-21T10:00:00.000Z' });
    assert.equal(reprogramada.status, 200);
    assert.equal(reprogramada.body.recordatorio_enviado_at, null);
    await recordatoriosService.enviarPendientes(ahora);
    assert.equal(correos.length, 2, 'La nueva fecha permite un nuevo recordatorio');

    // Reinicia la marca para verificar que completar bloquea un envío pendiente.
    assert.equal((await pedir('PUT', `/${id}`, { fecha_limite: '2026-10-21T09:00:00.000Z' })).status, 200);
    const completada = await pedir('PATCH', `/${id}/completar`);
    assert.equal(completada.status, 200);
    assert.equal(completada.body.estado, 'Completada');
    await recordatoriosService.enviarPendientes(ahora);
    assert.equal(correos.length, 2, 'No envía recordatorios de una tarea completada');
    const consultaFinal = await pedir('GET');
    assert.equal(consultaFinal.status, 200);
    assert.equal(consultaFinal.body[0].estado, 'Completada');
    assert.equal(consultaFinal.body[0].titulo, 'Confirmar seguimiento');
  });
}
