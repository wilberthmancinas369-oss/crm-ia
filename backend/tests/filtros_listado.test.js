import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { supabaseFalso } from './helpers/supabaseFalso.js';

process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';
const { default: supabase } = await import('../src/config/supabase.js');
const { perfilService } = await import('../src/services/perfil.service.js');
const { default: contactosRoutes } = await import('../src/routes/contactos.routes.js');
const { default: oportunidadesRoutes } = await import('../src/routes/oportunidades.routes.js');
const { default: tareasRoutes } = await import('../src/routes/tareas.routes.js');

const yo = '11111111-1111-4111-8111-111111111111';
const otro = '22222222-2222-4222-8222-222222222222';
const ajeno = '33333333-3333-4333-8333-333333333333';
let tablas, server, baseUrl;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/contactos', contactosRoutes);
  app.use('/oportunidades', oportunidadesRoutes);
  app.use('/tareas', tareasRoutes);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); });

beforeEach(() => {
  const contacto = { nombre: 'Ana María', apellido: 'López', empresa_cliente: 'ACME', estado: 'Activo' };
  const oportunidad = { nombre_oportunidad: 'Licencias ACME', etapa: 'Propuesta', responsable_id: otro, valor_estimado: 100 };
  const tarea = { titulo: 'Llamar a Ana', estado: 'Pendiente', responsable_id: yo,
    fecha_limite: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
  tablas = {
    contactos: [
      { ...contacto, id: 'c1', company_id: 'e1', group_id: 'g1' },
      { ...contacto, id: 'c2', company_id: 'e1', group_id: 'g2' },
      { ...contacto, id: 'c3', company_id: 'e2', group_id: 'g1' },
      { ...contacto, id: 'c4', company_id: 'e1', group_id: 'g1', estado: 'Inactivo', nombre: 'Luis', apellido: null, empresa_cliente: null }
    ],
    oportunidades: [
      { ...oportunidad, id: 'o1', company_id: 'e1', group_id: 'g1' },
      { ...oportunidad, id: 'o2', company_id: 'e1', group_id: 'g2' },
      { ...oportunidad, id: 'o3', company_id: 'e2', group_id: 'g1' },
      { ...oportunidad, id: 'o4', company_id: 'e1', group_id: 'g1', valor_estimado: null },
      { ...oportunidad, id: 'o5', company_id: 'e1', group_id: 'g1', valor_estimado: 0 }
    ],
    tareas: [
      { ...tarea, id: 't1', company_id: 'e1', contacto_id: 'c1' },
      { ...tarea, id: 't2', company_id: 'e1', contacto_id: 'c2' },
      { ...tarea, id: 't3', company_id: 'e2', contacto_id: 'c3' },
      { ...tarea, id: 't4', company_id: 'e1', oportunidad_id: 'o1', responsable_id: otro },
      { ...tarea, id: 't5', company_id: 'e1', oportunidad_id: 'o2', responsable_id: ajeno },
      { ...tarea, id: 't6', company_id: 'e1', contacto_id: 'c1', estado: 'Completada' }
    ]
  };
  supabase.from = supabaseFalso(tablas);
  supabase.auth.getUser = async () => ({ data: { user: { id: yo } }, error: null });
  perfilService.obtener = async () => ({ usuario: { id: yo }, empresa: { id: 'e1' }, grupos: [{ id: 'g1', nivel: 0 }] });
});

async function listar(lista, filtros = {}, token = true) {
  const respuesta = await fetch(`${baseUrl}/${lista}?${new URLSearchParams(filtros)}`, {
    headers: token ? { Authorization: 'Bearer prueba' } : {}
  });
  return { status: respuesta.status, body: await respuesta.json() };
}
const ids = (respuesta) => respuesta.body.map((fila) => fila.id).sort();

test('contactos: nombre completo, empresa y estado se combinan sin salir del grupo y empresa', async () => {
  const resultado = await listar('contactos', { nombre: ' ana LÓPEZ ', empresa: 'acm', estado: 'Activo', company_id: 'e2', group_id: 'g2' });
  assert.equal(resultado.status, 200);
  assert.deepEqual(ids(resultado), ['c1']);
  assert.deepEqual(ids(await listar('contactos', { estado: 'Inactivo' })), ['c4']);
});

for (const texto of ['50%_real', 'Ana,apellido.eq.López', 'Empresa("venta")', 'Ruta\\local']) {
  test(`contactos: trata como literal ${JSON.stringify(texto)}`, async () => {
    tablas.contactos[0].nombre = texto;
    tablas.contactos[0].empresa_cliente = texto;
    assert.deepEqual(ids(await listar('contactos', { nombre: texto, empresa: texto })), ['c1']);
    assert.deepEqual(ids(await listar('contactos', { nombre: `${texto}inexistente` })), []);
  });
}

test('oportunidades: combina texto, etapa, responsable y límites inclusivos', async () => {
  const resultado = await listar('oportunidades', { q: 'licencias', etapa: 'Propuesta', responsable_id: otro, monto_min: '100', monto_max: '100' });
  assert.equal(resultado.status, 200);
  assert.deepEqual(ids(resultado), ['o1']);
  assert.deepEqual(ids(await listar('oportunidades', { monto_max: '0' })), ['o5']);
  assert.deepEqual(ids(await listar('oportunidades')), ['o1', 'o4', 'o5']);
});

test('tareas: mantiene las propias por defecto y permite otros responsables o todos sin ampliar el alcance', async () => {
  assert.deepEqual(ids(await listar('tareas')), ['t1', 't6']);
  assert.deepEqual(ids(await listar('tareas', { responsable_id: otro })), ['t4']);
  assert.deepEqual(ids(await listar('tareas', { responsable_id: 'todos', q: 'ANA', estado: 'Pendiente' })), ['t1', 't4']);
  assert.deepEqual(ids(await listar('tareas', { responsable_id: ajeno })), []);
});

test('tareas: vencimiento excluye completadas, distingue vencidas y próximas, y recorre ambos vínculos', async () => {
  tablas.tareas[0].fecha_limite = new Date(Date.now() - 60000).toISOString();
  tablas.tareas.push({ ...tablas.tareas[3], id: 'lejana', fecha_limite: new Date(Date.now() + 48 * 3600000).toISOString() });
  assert.deepEqual(ids(await listar('tareas', { responsable_id: 'todos', vencimiento: 'vencidas' })), ['t1']);
  assert.deepEqual(ids(await listar('tareas', { responsable_id: 'todos', vencimiento: 'proximas_24h' })), ['t4']);
  assert.deepEqual(ids(await listar('tareas', { responsable_id: 'todos', vencimiento: 'sin_vencer' })), ['lejana', 't4']);
  assert.deepEqual(ids(await listar('tareas', { estado: 'Completada', vencimiento: 'proximas_24h' })), []);
});

test('el administrador conserva el alcance de empresa sin ver datos de otra empresa', async () => {
  perfilService.obtener = async () => ({ usuario: { id: yo }, empresa: { id: 'e1' }, grupos: [{ id: 'g1', nivel: 2 }] });
  assert.deepEqual(ids(await listar('contactos', { nombre: 'Ana' })), ['c1', 'c2']);
  assert.deepEqual(ids(await listar('oportunidades', { monto_min: '100' })), ['o1', 'o2']);
  assert.deepEqual(ids(await listar('tareas', { responsable_id: 'todos', estado: 'Pendiente' })), ['t1', 't2', 't4', 't5']);
});

for (const [lista, filtros] of [
  ['contactos', { estado: 'Prospecto' }],
  ['contactos', { 'nombre[x]': 'Ana' }],
  ['oportunidades', { etapa: 'Otra' }],
  ['oportunidades', { responsable_id: 'todos' }],
  ['oportunidades', { monto_min: '-1' }],
  ['oportunidades', { monto_min: 'abc' }],
  ['oportunidades', { monto_max: '12.345' }],
  ['oportunidades', { monto_max: '10000000000' }],
  ['oportunidades', { monto_min: '20', monto_max: '10' }],
  ['tareas', { responsable_id: 'incorrecto' }],
  ['tareas', { estado: 'Cancelada' }],
  ['tareas', { vencimiento: 'manana' }]
]) {
  test(`${lista}: rechaza filtros inválidos ${JSON.stringify(filtros)}`, async () => {
    const resultado = await listar(lista, filtros);
    assert.equal(resultado.status, 400);
    assert.ok(resultado.body.error);
  });
}

for (const lista of ['contactos', 'oportunidades', 'tareas']) {
  test(`${lista}: lista vacía válida, filtros vacíos y sesión obligatoria`, async () => {
    assert.equal((await listar(lista, {}, false)).status, 401);
    const vacio = await listar(lista, { [lista === 'contactos' ? 'nombre' : 'q']: 'sin-coincidencias' });
    assert.equal(vacio.status, 200);
    assert.deepEqual(vacio.body, []);
    assert.deepEqual(await listar(lista, { estado: '   ', responsable_id: '', q: ' ' }), await listar(lista));
  });
}

// HU-12: los mismos datos coinciden en otra empresa y otro grupo, para detectar
// consultas que olviden aplicar el alcance antes o después de los filtros.
const escenariosAislamiento = [
  { lista: 'contactos', filtros: { nombre: 'Ana López', empresa: 'ACME', estado: 'Activo' }, propios: ['c1'], empresa: ['c1', 'c2'] },
  { lista: 'oportunidades', filtros: { q: 'ACME', etapa: 'Propuesta', responsable_id: otro, monto_min: '100', monto_max: '100' }, propios: ['o1'], empresa: ['o1', 'o2'] },
  { lista: 'tareas', filtros: { q: 'Ana', estado: 'Pendiente', vencimiento: 'proximas_24h', responsable_id: 'todos' }, propios: ['t1', 't4'], empresa: ['t1', 't2', 't4', 't5'] }
];

for (const [rol, nivel] of [['Agente', 0], ['Jefe de Área', 1], ['Administrador', 2]]) {
  for (const escenario of escenariosAislamiento) {
    test(`${rol}: ${escenario.lista} conserva su alcance aunque se manipulen empresa, grupo y expresiones`, async () => {
      perfilService.obtener = async () => ({ usuario: { id: yo }, empresa: { id: 'e1' }, grupos: [{ id: 'g1', nivel }] });
      const resultado = await listar(escenario.lista, {
        ...escenario.filtros,
        company_id: 'e2', group_id: 'g2', grupo_id: 'g2',
        or: '(company_id.eq.e2,group_id.eq.g2)', alcance: 'todos'
      });
      assert.equal(resultado.status, 200);
      assert.deepEqual(ids(resultado), nivel === 2 ? escenario.empresa : escenario.propios);
      assert.ok(resultado.body.every((fila) => fila.company_id === 'e1'));
    });
  }
}

for (const { lista } of escenariosAislamiento) {
  test(`${lista}: una coincidencia exclusiva fuera del alcance devuelve 200 y []`, async () => {
    if (lista === 'contactos') {
      tablas.contactos[1].nombre = 'Solo ajeno';
      tablas.contactos[2].nombre = 'Solo ajeno';
    } else if (lista === 'oportunidades') {
      tablas.oportunidades[1].nombre_oportunidad = 'Solo ajeno';
      tablas.oportunidades[2].nombre_oportunidad = 'Solo ajeno';
    } else {
      tablas.tareas[1].titulo = 'Solo ajeno';
      tablas.tareas[2].titulo = 'Solo ajeno';
      tablas.tareas[4].titulo = 'Solo ajeno';
      // Incluye el camino de oportunidad para comprobar ambos joins de tareas.
      tablas.tareas.push({ ...tablas.tareas[2], id: 't7', contacto_id: null, oportunidad_id: 'o3' });
    }
    const datosAntes = JSON.stringify(tablas);
    const resultado = await listar(lista, {
      [lista === 'contactos' ? 'nombre' : 'q']: 'Solo ajeno',
      ...(lista === 'tareas' ? { responsable_id: 'todos' } : {})
    });
    assert.equal(resultado.status, 200);
    assert.deepEqual(resultado.body, []);
    assert.equal(JSON.stringify(tablas), datosAntes, 'La búsqueda no modifica ni borra registros');
    const sinFiltros = await listar(lista);
    assert.equal(sinFiltros.status, 200);
    assert.ok(sinFiltros.body.length > 0, 'Limpiar permite recuperar el listado autorizado');
  });

  test(`${lista}: sin perfil o sin grupos no permite consultar con filtros`, async () => {
    const filtros = lista === 'tareas' ? { responsable_id: 'todos' } : {};
    perfilService.obtener = async () => null;
    assert.equal((await listar(lista, filtros)).status, 403);
    perfilService.obtener = async () => ({ usuario: { id: yo }, empresa: { id: 'e1' }, grupos: [] });
    assert.equal((await listar(lista, filtros)).status, 403);
  });

  test(`${lista}: un error de base de datos responde 500 y no se presenta como búsqueda vacía`, async () => {
    supabase.from = () => { throw new Error('Fallo de consulta simulado'); };
    const resultado = await listar(lista);
    assert.equal(resultado.status, 500);
    assert.ok(resultado.body.error);
    assert.equal(Array.isArray(resultado.body), false);
  });
}

test('una cuenta con dos grupos autorizados puede consultar ambos, pero no otra empresa', async () => {
  perfilService.obtener = async () => ({ usuario: { id: yo }, empresa: { id: 'e1' }, grupos: [{ id: 'g1', nivel: 0 }, { id: 'g2', nivel: 1 }] });
  for (const escenario of escenariosAislamiento) {
    assert.deepEqual(ids(await listar(escenario.lista, escenario.filtros)), escenario.empresa);
  }
});

test('responsables ajenos no revelan registros de oportunidades ni tareas', async () => {
  tablas.oportunidades[1].responsable_id = ajeno;
  tablas.oportunidades[2].responsable_id = ajeno;
  for (const lista of ['oportunidades', 'tareas']) {
    const resultado = await listar(lista, { responsable_id: ajeno });
    assert.equal(resultado.status, 200);
    assert.deepEqual(resultado.body, []);
  }
});

for (const lista of ['contactos', 'oportunidades', 'tareas']) {
  test(`${lista}: rechaza un parámetro de búsqueda repetido sin ejecutar una consulta`, async () => {
    supabase.from = () => { throw new Error('No debe consultarse la base'); };
    const campo = lista === 'contactos' ? 'nombre' : 'q';
    const respuesta = await fetch(`${baseUrl}/${lista}?${campo}=Ana&${campo}=Luis`, { headers: { Authorization: 'Bearer prueba' } });
    assert.equal(respuesta.status, 400);
  });
}
