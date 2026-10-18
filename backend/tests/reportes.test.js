import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';
const { default: supabase } = await import('../src/config/supabase.js');
const { perfilService } = await import('../src/services/perfil.service.js');
const { default: reportesRoutes } = await import('../src/routes/reportes.routes.js');

const G1 = '11111111-1111-4111-8111-111111111111';
const G2 = '22222222-2222-4222-8222-222222222222';
const G3 = '33333333-3333-4333-8333-333333333333';
let server, url, perfil, filas, consultas, errorConsulta;

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
  supabase.auth.getUser = async token => token === 'valido'
    ? { data: { user: { id: 'jefe' } }, error: null }
    : { data: null, error: { message: 'Invalid token' } };
  perfilService.obtener = async () => perfil;
  supabase.from = tabla => {
    consultas.push(tabla);
    assert.ok(['oportunidades', 'groups'].includes(tabla), 'No consultar un modelo de tareas supuesto');
    const filtros = [];
    const aplicar = datos => datos.filter(fila => filtros.every(([campo, valor]) => fila[campo] === valor));
    const consulta = {
      select(campos) {
        if (tabla === 'oportunidades') assert.equal(campos, 'id, valor_estimado, etapa');
        return consulta;
      },
      eq(campo, valor) { filtros.push([campo, valor]); return consulta; },
      order(campo) { assert.equal(campo, 'id'); return consulta; },
      async range(inicio, fin) {
        assert.ok(filtros.some(([campo]) => campo === 'company_id'));
        assert.ok(filtros.some(([campo]) => campo === 'group_id'));
        return { data: aplicar(filas).slice(inicio, fin + 1), error: errorConsulta };
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
  assert.equal(body.productividad, null);
  assert.equal(body.productividadDisponible, false);
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
test('un grupo sin oportunidades devuelve cero ventas, sin inventar cifras de tareas', async () => {
  filas = [];
  const { body } = await pedir();
  assert.deepEqual(body.ventas, { montoTotal: 0, totalOportunidades: 0, distribucionEtapas: {} });
  assert.equal(body.productividad, null);
});
test('el reporte incluye más de mil oportunidades mediante paginación', async () => {
  filas = Array.from({ length: 1001 }, (_, id) => ({
    id: String(id), company_id: 'empresa-1', group_id: G1, valor_estimado: '0.10', etapa: 'Ganado'
  }));
  const { body } = await pedir();
  assert.equal(body.ventas.totalOportunidades, 1001);
  assert.equal(body.ventas.montoTotal, 100.1);
  assert.equal(body.ventas.distribucionEtapas.Ganado, 1001);
  assert.equal(consultas.length, 3);
});
test('un error de base de datos produce error y no un reporte vacío exitoso', async () => {
  errorConsulta = { message: 'detalle interno', code: 'XX000' };
  const { status, body } = await pedir();
  assert.equal(status, 500);
  assert.equal(body.error, 'No se pudo generar el reporte del grupo');
});
