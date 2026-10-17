import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseFalso } from './helpers/supabaseFalso.js';

process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';
const { default: supabase } = await import('../src/config/supabase.js');
const { emailService } = await import('../src/services/email.service.js');
const { recordatoriosService, iniciarRecordatorios } = await import('../src/services/recordatorios.service.js');
const ahora = new Date('2026-10-20T12:00:00Z');
let tablas, envAnterior;

beforeEach(() => {
  envAnterior = { ...process.env };
  process.env.BREVO_API_KEY = 'clave-ficticia';
  process.env.BREVO_SENDER_EMAIL = 'crm@example.test';
  process.env.RECORDATORIOS_ZONA_HORARIA = 'America/Tijuana';
  tablas = {
    profiles: [{ id: 'usuario-1', email: 'responsable@example.test' }],
    tareas: [{ id: 't1', company_id: 'empresa-1', responsable_id: 'usuario-1', titulo: 'Llamar al contacto',
      fecha_limite: '2026-10-21T12:00:00.000Z', estado: 'Pendiente', recordatorio_enviado_at: null }]
  };
  supabase.from = supabaseFalso(tablas);
});
afterEach(() => {
  mock.restoreAll();
  for (const clave of Object.keys(process.env)) if (!(clave in envAnterior)) delete process.env[clave];
  Object.assign(process.env, envAnterior);
});

test('envía solo tareas próximas sin completar y guarda la marca para no repetir', async () => {
  const tarea = tablas.tareas[0];
  tablas.tareas.push(
    { ...tarea, id: 'en-progreso', estado: 'En progreso', fecha_limite: '2026-10-20T13:00:00Z' },
    { ...tarea, id: 'completada', estado: 'Completada' },
    { ...tarea, id: 'vencida', fecha_limite: '2026-10-20T11:00:00Z' },
    { ...tarea, id: 'vence-ahora', fecha_limite: ahora.toISOString() },
    { ...tarea, id: 'lejana', fecha_limite: '2026-10-21T12:00:01Z' },
    { ...tarea, id: 'enviada', recordatorio_enviado_at: '2026-10-20T10:00:00Z' }
  );
  const enviar = mock.method(emailService, 'sendTaskReminder', async () => ({ success: true }));
  await recordatoriosService.enviarPendientes(ahora);
  await recordatoriosService.enviarPendientes(ahora);
  assert.equal(enviar.mock.callCount(), 2);
  assert.deepEqual(enviar.mock.calls[0].arguments, ['responsable@example.test', 'Llamar al contacto', tarea.fecha_limite]);
  assert.equal(tarea.recordatorio_enviado_at, ahora.toISOString());
  assert.equal(tablas.tareas.find((fila) => fila.id === 'completada').recordatorio_enviado_at, null);
});

test('un fallo de correo no marca la tarea y permite reintentar sin detener otras tareas', async () => {
  tablas.tareas.push({ ...tablas.tareas[0], id: 't2' });
  mock.method(console, 'error', () => {});
  const enviar = mock.method(emailService, 'sendTaskReminder', async () => ({ success: false, error: 'Brevo no disponible' }));
  await recordatoriosService.enviarPendientes(ahora);
  assert.equal(enviar.mock.callCount(), 2);
  assert.ok(tablas.tareas.every((fila) => fila.recordatorio_enviado_at === null));
  enviar.mock.restore();
  mock.method(emailService, 'sendTaskReminder', async () => ({ success: true }));
  await recordatoriosService.enviarPendientes(ahora);
  assert.ok(tablas.tareas.every((fila) => fila.recordatorio_enviado_at === ahora.toISOString()));
});

test('si cambia el responsable durante el envío no marca la nueva asignación', async () => {
  mock.method(emailService, 'sendTaskReminder', async () => {
    tablas.tareas[0].responsable_id = 'usuario-2';
    return { success: true };
  });
  await recordatoriosService.enviarPendientes(ahora);
  assert.equal(tablas.tareas[0].recordatorio_enviado_at, null);
});

test('usa Brevo con el destinatario, título, fecha y enlace; escapa HTML del título', async () => {
  process.env.FRONTEND_URL = 'https://crm.example.test/';
  const peticion = mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ messageId: 'correo-1' }) }));
  const resultado = await emailService.sendTaskReminder('responsable@example.test', '<b>Tarea & prueba</b>', tablas.tareas[0].fecha_limite);
  assert.equal(resultado.success, true);
  const [url, opciones] = peticion.mock.calls[0].arguments;
  const correo = JSON.parse(opciones.body);
  assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(opciones.headers['api-key'], 'clave-ficticia');
  assert.equal(correo.to[0].email, 'responsable@example.test');
  assert.equal(correo.subject, 'Recordatorio de vencimiento: <b>Tarea & prueba</b>');
  assert.ok(correo.htmlContent.includes('&lt;b&gt;Tarea &amp; prueba&lt;/b&gt;'));
  assert.ok(correo.htmlContent.includes('https://crm.example.test/app/tareas'));
  assert.ok(correo.htmlContent.includes('America/Tijuana'));
  assert.ok(correo.htmlContent.includes('#1f2a5c'));
});

test('un rechazo de Brevo se reporta como fallo de envío', async () => {
  mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 429, json: async () => ({ message: 'Límite de envío' }) }));
  assert.deepEqual(await emailService.sendTaskReminder('a@example.test', 'Tarea', tablas.tareas[0].fecha_limite), {
    success: false, error: 'Límite de envío'
  });
});

test('no inicia envíos si no se activa explícitamente o faltan credenciales', () => {
  const enviar = mock.method(recordatoriosService, 'enviarPendientes', async () => {});
  process.env.RECORDATORIOS_ACTIVOS = 'false';
  assert.equal(iniciarRecordatorios(), undefined);
  process.env.RECORDATORIOS_ACTIVOS = 'true';
  delete process.env.BREVO_API_KEY;
  mock.method(console, 'error', () => {});
  assert.equal(iniciarRecordatorios(), undefined);
  assert.equal(enviar.mock.callCount(), 0);
});

test('revisa al arrancar y cada 15 minutos sin superponer revisiones', async () => {
  process.env.RECORDATORIOS_ACTIVOS = 'true';
  let resolver;
  const enviar = mock.method(recordatoriosService, 'enviarPendientes', () => new Promise((resolve) => { resolver = resolve; }));
  let revisar;
  mock.method(globalThis, 'setInterval', (callback, intervalo) => {
    revisar = callback;
    assert.equal(intervalo, 15 * 60 * 1000);
    return { unref() {} };
  });
  mock.method(globalThis, 'clearInterval', () => {});
  const detener = iniciarRecordatorios();
  assert.equal(enviar.mock.callCount(), 1);
  await revisar();
  assert.equal(enviar.mock.callCount(), 1);
  resolver();
  await new Promise((resolve) => setImmediate(resolve));
  const siguiente = revisar();
  assert.equal(enviar.mock.callCount(), 2);
  resolver();
  await siguiente;
  detener();
});
