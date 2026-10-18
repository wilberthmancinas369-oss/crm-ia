import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';
const { default: supabase } = await import('../src/config/supabase.js');
const { reportesService } = await import('../src/services/reportes.service.js');
const { perfilService } = await import('../src/services/perfil.service.js');
const { default: reportesRoutes } = await import('../src/routes/reportes.routes.js');

const G1 = '11111111-1111-4111-8111-111111111111';
const G2 = '22222222-2222-4222-8222-222222222222';
const G3 = '33333333-3333-4333-8333-333333333333';
let server, url, perfil, filas, consultas, errorConsulta, tareas, errorTareas;

before(async () => {
  const app = express();
  app.use('/api/reportes', reportesRoutes);
  server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  url = `http://127.0.0.1:${server.address().port}/api/reportes/jefe`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

beforeEach(() => {
  perfil = { usuario: { id: 'jefe' }, empresa: { id: 'empresa-1' },
    grupos: [{ id: G1, nivel: 1 }, { id: G2, nivel: 0 }] };
  filas = [
    { id: '1', company_id: 'empresa-1', group_id: G1, valor_estimado: '10.10', etapa: 'Propuesta' },
    { id: '2', company_id: 'empresa-1', group_id: G1, valor_estimado: '20.20', etapa: 'Ganado' },
    { id: '3', company_id: 'empresa-1', group_id: G1, valor_estimado: null, etapa: 'Propuesta' },
    { id: '4', company_id: 'empresa-1', group_id: G2, valor_estimado: 800, etapa: 'Ganado' },
    { id: '5', company_id: 'empresa-2', group_id: G1, valor_estimado: 900, etapa: 'Ganado' }
  ];
  consultas = [];
  errorConsulta = null;
  errorTareas = null;
  tareas = [];
  supabase.auth.getUser = async token => token === 'valido'
    ? { data: { user: { id: 'jefe' } }, error: null }
    : { data: null, error: { message: 'Invalid token' } };
  perfilService.obtener = async () => perfil;
  supabase.from = tabla => {
    consultas.push(tabla);
    assert.ok(['oportunidades', 'groups', 'tareas'].includes(tabla));
    let vinculo;
    const filtros = [];
    const aplicar = datos => datos.filter(fila => filtros.every(([campo, valor]) => {
      const actual = campo.split('.').reduce((obj, clave) => obj?.[clave], fila);
      return Array.isArray(valor) ? valor.includes(actual) : actual === valor;
    }));
    const consulta = {
      select(campos) {
        if (tabla === 'oportunidades') assert.equal(campos, 'id, valor_estimado, etapa');
        if (tabla === 'tareas') {
          assert.ok(campos.includes('profiles!inner'));
          vinculo = campos.includes('contactos!inner') ? 'contactos' : 'oportunidades';
        }
        return consulta;
      },
      eq(campo, valor) { filtros.push([campo, valor]); return consulta; },
      in(campo, valores) { filtros.push([campo, valores]); return consulta; },
      order(campo) { assert.equal(campo, 'id'); return consulta; },
      async range(inicio, fin) {
        assert.ok(filtros.some(([campo]) => campo === 'company_id'));
        assert.ok(filtros.some(([campo]) => campo === (tabla === 'tareas' ? `${vinculo}.group_id` : 'group_id')));
        const datos = tabla === 'tareas' ? tareas.filter(tarea => tarea[vinculo]) : filas;
        return { data: aplicar(datos).slice(inicio, fin + 1), error: tabla === 'tareas' ? errorTareas : errorConsulta };
      },
      async maybeSingle() {
        return { data: aplicar([
          { id: G1, company_id: 'empresa-1' },
          { id: G2, company_id: 'empresa-1' },
          { id: G3, company_id: 'empresa-2' }
        ])[0] ?? null, error: null };
      }
    };
    return consulta;
  };
});

async function pedir(query = '', token = 'valido') {
  const response = await fetch(url + query, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: response.status, body: await response.json() };
}

test('la ruta exige autenticación incluso antes de consultar datos', async () => {
  assert.equal((await pedir('', null)).status, 401);
  assert.equal((await pedir('', 'invalido')).status, 401);
  assert.equal(consultas.length, 0);
});
test('un Agente no puede consultar reportes', async () => {
  perfil.grupos = [{ id: G1, nivel: 0 }];
  assert.equal((await pedir()).status, 403);
  assert.equal(consultas.length, 0);
});
test('un Jefe solo obtiene totales del grupo que dirige y de su empresa', async () => {
  const { status, body } = await pedir('?empresa_id=empresa-2&company_id=empresa-2');
  assert.equal(status, 200);
  assert.equal(body.grupo_id, G1);
  assert.deepEqual(body.ventas, {
    montoTotal: 30.3, totalOportunidades: 3, distribucionEtapas: { Propuesta: 2, Ganado: 1 }
  });
  assert.deepEqual(body.productividad, {});
  assert.equal(body.productividadDisponible, true);
});
test('ser Agente en otro grupo no permite ver su reporte ni el de grupos ajenos', async () => {
  assert.equal((await pedir(`?grupo_id=${G2}`)).status, 403);
  assert.equal((await pedir(`?grupo_id=${G3}`)).status, 403);
  assert.equal(consultas.length, 0);
});
test('un Jefe de varios grupos debe seleccionar uno y recibe solo ese grupo', async () => {
  perfil.grupos[1].nivel = 1;
  assert.equal((await pedir()).status, 400);
  const { status, body } = await pedir(`?grupo_id=${G2}`);
  assert.equal(status, 200);
  assert.equal(body.ventas.montoTotal, 800);
  assert.equal(body.ventas.totalOportunidades, 1);
});
test('rechaza un identificador de grupo inválido', async () => {
  assert.equal((await pedir('?grupo_id=incorrecto')).status, 400);
  assert.equal(consultas.length, 0);
});
test('el Administrador puede consultar otro grupo de su empresa', async () => {
  perfil.grupos[0].nivel = 2;
  const { status, body } = await pedir(`?grupo_id=${G2}`);
  assert.equal(status, 200);
  assert.equal(body.ventas.montoTotal, 800);
});
test('el Administrador no puede consultar grupos de otra empresa', async () => {
  perfil.grupos[0].nivel = 2;
  assert.equal((await pedir(`?grupo_id=${G3}`)).status, 404);
  assert.ok(!consultas.includes('oportunidades'));
});
test('un grupo sin oportunidades ni tareas devuelve totales vacíos', async () => {
  filas = [];
  const { body } = await pedir();
  assert.deepEqual(body.ventas, { montoTotal: 0, totalOportunidades: 0, distribucionEtapas: {} });
  assert.deepEqual(body.productividad, {});
});
test('el reporte incluye más de mil oportunidades mediante paginación', async () => {
  filas = Array.from({ length: 1001 }, (_, id) => ({
    id: String(id), company_id: 'empresa-1', group_id: G1, valor_estimado: '0.10', etapa: 'Ganado'
  }));
  const { body } = await pedir();
  assert.equal(body.ventas.totalOportunidades, 1001);
  assert.equal(body.ventas.montoTotal, 100.1);
  assert.equal(body.ventas.distribucionEtapas.Ganado, 1001);
  assert.equal(consultas.filter(tabla => tabla === 'oportunidades').length, 3);
});
test('un error de base de datos produce error y no un reporte vacío exitoso', async () => {
  errorConsulta = { message: 'detalle interno', code: 'XX000' };
  const { status, body } = await pedir();
  assert.equal(status, 500);
  assert.equal(body.error, 'No se pudo generar el reporte del grupo');
});

test('sin group_id devuelve disponibilidad explícita sin consultar datos de toda la empresa', async () => {
  errorConsulta = { code: '42703', message: 'column oportunidades.group_id does not exist' };
  const { status, body } = await pedir();
  assert.equal(status, 200);
  assert.equal(body.ventasDisponible, false);
  assert.equal(body.ventas, null);
  assert.equal(body.productividadDisponible, false);
  assert.equal(body.productividad, null);
  assert.deepEqual(consultas, ['oportunidades']);
});

test('una columna inesperada ausente sigue siendo un error', async () => {
  errorConsulta = { code: '42703', message: 'column oportunidades.valor_estimado does not exist' };
  assert.equal((await pedir()).status, 500);
});

test('un Agente sigue sin acceso aunque falten migraciones', async () => {
  errorConsulta = { code: '42703', message: 'column oportunidades.group_id does not exist' };
  perfil.grupos = [{ id: G1, nivel: 0 }];
  assert.equal((await pedir()).status, 403);
  assert.deepEqual(consultas, []);
});


const tarea = (cambios = {}) => ({
  id: 't1', company_id: 'empresa-1', responsable_id: 'ana', estado: 'Pendiente',
  fecha_limite: '2000-01-01T00:00:00Z',
  profiles: { id: 'ana', full_name: 'Ana', company_id: 'empresa-1' },
  contactos: { group_id: G1, company_id: 'empresa-1' },
  ...cambios
});

test('agrega tareas de contacto y oportunidad por responsable, excluyendo completadas', async () => {
  tareas = [tarea(), tarea({ id: 't2', contactos: null,
    oportunidades: { group_id: G1, company_id: 'empresa-1' },
    estado: 'En progreso', fecha_limite: '2999-01-01T00:00:00Z'
  }), tarea({ id: 't3', estado: 'Completada' }), tarea({ id: 't4', responsable_id: 'luis',
    profiles: { id: 'luis', full_name: 'Luis', company_id: 'empresa-1' }
  })];
  const { status, body } = await pedir();
  assert.equal(status, 200);
  assert.deepEqual(body.productividad, {
    ana: { nombre: 'Ana', pendientes: 2, vencidas: 1 },
    luis: { nombre: 'Luis', pendientes: 1, vencidas: 1 }
  });
});
test('las tareas heredan el grupo del vínculo; no se mezclan otros grupos o empresas', async () => {
  tareas = [tarea(), tarea({ id: 't2', contactos: { group_id: G2, company_id: 'empresa-1' } }),
    tarea({ id: 't3', contactos: null, oportunidades: { group_id: G2, company_id: 'empresa-1' } }),
    tarea({ id: 't4', company_id: 'empresa-2' })];
  const { body } = await pedir();
  assert.deepEqual(body.productividad, { ana: { nombre: 'Ana', pendientes: 1, vencidas: 1 } });
});
test('compara fechas como instantes y no como texto, incluyendo la frontera exacta', async () => {
  tareas = [tarea({ fecha_limite: '2026-10-18T05:00:00-07:00' }),
    tarea({ id: 't2', fecha_limite: '2026-10-18T05:00:01-07:00' }),
    tarea({ id: 't3', fecha_limite: '2026-10-18T04:59:59-07:00' })];
  const body = await reportesService.getResumenJefe({ companyId: 'empresa-1', groupId: G1 }, new Date('2026-10-18T12:00:00Z'));
  assert.equal(body.productividad.ana.pendientes, 3);
  assert.equal(body.productividad.ana.vencidas, 1);
});
test('incluye más de mil tareas sin truncar la productividad', async () => {
  tareas = Array.from({ length: 1001 }, (_, id) => tarea({ id: String(id) }));
  const { body } = await pedir();
  assert.equal(body.productividad.ana.pendientes, 1001);
  assert.equal(body.productividad.ana.vencidas, 1001);
});
test('si falta la migración de tareas conserva ventas y marca productividad no disponible', async () => {
  for (const code of ['42P01', 'PGRST205']) {
    errorTareas = { code, message: 'Tabla tareas no disponible' };
    const { status, body } = await pedir();
    assert.equal(status, 200);
    assert.equal(body.ventas.montoTotal, 30.3);
    assert.equal(body.productividadDisponible, false);
    assert.equal(body.productividad, null);
  }
});
test('un fallo de permisos o de consulta de tareas no se presenta como cero tareas', async () => {
  errorTareas = { code: '42501', message: 'Permission denied' };
  assert.equal((await pedir()).status, 500);
});
