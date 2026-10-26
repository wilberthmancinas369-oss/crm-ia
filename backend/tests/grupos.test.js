// ===================== HU-14: renombrar y eliminar grupos =====================
// Solo el Administrador puede; el Jefe de Área recibe 403 y las operaciones rechazadas no pierden datos.

const EMPRESA = 'c1';
const perfilDe = (id, grupos) => ({
  usuario: { id, nombre: id, email: `${id}@x.com` },
  empresa: { id: EMPRESA, nombre: 'Empresa Uno' },
  grupos: grupos.map(([grupo, nivel]) => ({ id: grupo, nombre: grupo, rol: String(nivel), nivel }))
});
const ADMIN = perfilDe('admin', [['gA', NIVELES.ADMINISTRADOR]]);
const JEFE = perfilDe('jefe', [['g1', NIVELES.JEFE_AREA]]);
const AGENTE = perfilDe('agente', [['g1', NIVELES.AGENTE]]);

const miembro = (user_id, group_id, company_id = EMPRESA) => ({ user_id, group_id, company_id });

// Empresa c1: Ventas (g1, con miembros), Soporte (g2, vacío), Archivo (gVacio, vacío con invitaciones),
// Con datos (gDatos, sin miembros pero con un contacto) y Administración (gA). Empresa c2: grupo "Otra".
const datosIniciales = () => ({
  groups: [
    { id: 'g1', name: 'Ventas', description: 'Equipo de ventas', company_id: EMPRESA },
    { id: 'g2', name: 'Soporte', description: null, company_id: EMPRESA },
    { id: 'gVacio', name: 'Archivo', description: null, company_id: EMPRESA },
    { id: 'gDatos', name: 'Con datos', description: null, company_id: EMPRESA },
    { id: 'gA', name: 'Administración', description: null, company_id: EMPRESA },
    { id: 'gX', name: 'Otra', description: null, company_id: 'c2' }
  ],
  user_group_role: [miembro('admin', 'gA'), miembro('jefe', 'g1'), miembro('agente', 'g1')],
  invitations: [
    { id: 'iG1', status: 'pendiente', group_id: 'g1', company_id: EMPRESA },
    { id: 'iP1', status: 'pendiente', group_id: 'gVacio', company_id: EMPRESA },
    { id: 'iP2', status: 'pendiente', group_id: 'gVacio', company_id: EMPRESA },
    { id: 'iAcep', status: 'aceptada', group_id: 'gVacio', company_id: EMPRESA },
    { id: 'iX', status: 'pendiente', group_id: 'gX', company_id: 'c2' }
  ],
  contactos: [{ id: 'ct1', group_id: 'gDatos', company_id: EMPRESA }],
  oportunidades: []
});

// Mini Supabase con los filtros que usan renombrarGrupo (eq, neq, ilike, limit) y update
const supabaseMinimo = (db) => (tabla) => {
  const filtros = [];
  let cambios = null;
  const ejecutar = () => {
    const coinciden = db[tabla].filter((fila) => filtros.every((fn) => fn(fila)));
    if (cambios) coinciden.forEach((fila) => Object.assign(fila, cambios));
    return coinciden;
  };
  const consulta = {
    select: () => consulta,
    update: (valores) => { cambios = valores; return consulta; },
    eq: (col, val) => { filtros.push((f) => f[col] === val); return consulta; },
    neq: (col, val) => { filtros.push((f) => f[col] !== val); return consulta; },
    // El controlador escapa % _ \ para comparar como texto literal; aquí se desescapa y se compara sin mayúsculas
    ilike: (col, patron) => {
      const texto = patron.replace(/\\([\\%_])/g, '$1').toLowerCase();
      filtros.push((f) => String(f[col]).toLowerCase() === texto);
      return consulta;
    },
    limit: () => consulta,
    maybeSingle: async () => ({ data: ejecutar()[0] ?? null, error: null }),
    single: async () => {
      const fila = ejecutar()[0];
      return fila ? { data: fila, error: null } : { data: null, error: { code: 'PGRST116', message: 'sin filas' } };
    }
  };
  return consulta;
};

// Simula la función SQL eliminar_grupo (backend/db/migrations/hu14_eliminar_grupo.sql): mismas reglas,
// mismos errores y el borrado en cascada de las invitaciones del grupo
const rpcFalso = (db) => async (nombre, { p_group_id, p_company_id }) => {
  if (nombre !== 'eliminar_grupo') return { data: null, error: { message: `Función desconocida: ${nombre}` } };

  const grupo = db.groups.find((g) => g.id === p_group_id && g.company_id === p_company_id);
  if (!grupo) return { data: null, error: { message: 'GRUPO_NO_ENCONTRADO' } };

  if (db.user_group_role.some((m) => m.group_id === p_group_id && m.company_id === p_company_id)) {
    return { data: null, error: { message: 'GRUPO_CON_MIEMBROS' } };
  }
  const conDatos = (tabla) => db[tabla].some((r) => r.group_id === p_group_id && r.company_id === p_company_id);
  if (conDatos('contactos') || conDatos('oportunidades')) {
    return { data: null, error: { message: 'GRUPO_CON_DATOS' } };
  }

  const pendientes = db.invitations.filter(
    (i) => i.group_id === p_group_id && i.company_id === p_company_id && i.status === 'pendiente'
  );
  db.groups = db.groups.filter((g) => g !== grupo);
  db.invitations = db.invitations.filter((i) => i.group_id !== p_group_id); // FK con ON DELETE CASCADE
  return { data: pendientes.length, error: null };
};

// Ejecuta autorizar(permiso) + controlador como lo haría Express
async function peticion(perfil, permiso, controlador, { body = {}, params = {} } = {}) {
  perfilService.obtener = async () => perfil;
  const req = { user: { id: perfil.usuario.id }, body, params };
  const res = mockRes();
  let siguio = false;
  await autorizar(permiso)(req, res, () => { siguio = true; });
  if (siguio) await controlador(req, res);
  return res;
}

describe('HU-14: renombrar grupo', () => {
  let db;
  beforeEach(() => {
    db = datosIniciales();
    supabase.from = supabaseMinimo(db);
  });

  const renombrar = (perfil, id, name) =>
    peticion(perfil, 'renombrarGrupos', renombrarGrupo, { params: { id }, body: { name } });
  const grupo = (id) => db.groups.find((g) => g.id === id);

  test('el Administrador renombra un grupo de su empresa', async () => {
    const res = await renombrar(ADMIN, 'g2', 'Atención a clientes');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.group.name, 'Atención a clientes');
    assert.equal(grupo('g2').name, 'Atención a clientes');
  });

  test('el Jefe de Área recibe 403 y no se pierden datos', async () => {
    const antes = structuredClone(db);
    assert.equal((await renombrar(JEFE, 'g1', 'Nuevo nombre')).statusCode, 403);
    assert.deepEqual(db, antes);
  });

  test('el Agente recibe 403 y no se pierden datos', async () => {
    const antes = structuredClone(db);
    assert.equal((await renombrar(AGENTE, 'g1', 'Nuevo nombre')).statusCode, 403);
    assert.deepEqual(db, antes);
  });

  test('rechaza un nombre repetido en la empresa (409), sin distinguir mayúsculas', async () => {
    const antes = structuredClone(db);
    assert.equal((await renombrar(ADMIN, 'g2', 'Ventas')).statusCode, 409);
    assert.equal((await renombrar(ADMIN, 'g2', 'ventas')).statusCode, 409);
    assert.deepEqual(db, antes);
  });

  test('permite un nombre que solo existe en otra empresa', async () => {
    const res = await renombrar(ADMIN, 'g2', 'Otra');
    assert.equal(res.statusCode, 200);
    assert.equal(grupo('g2').name, 'Otra');
  });

  test('un grupo conserva su nombre o cambia solo las mayúsculas sin chocar consigo mismo', async () => {
    assert.equal((await renombrar(ADMIN, 'g1', 'Ventas')).statusCode, 200);
    assert.equal(grupo('g1').name, 'Ventas');

    assert.equal((await renombrar(ADMIN, 'g1', 'VENTAS')).statusCode, 200);
    assert.equal(grupo('g1').name, 'VENTAS');
  });

  test('un grupo de otra empresa o inexistente responde 404 sin cambios', async () => {
    const antes = structuredClone(db);
    assert.equal((await renombrar(ADMIN, 'gX', 'Intruso')).statusCode, 404);
    assert.equal((await renombrar(ADMIN, 'no-existe', 'Fantasma')).statusCode, 404);
    assert.deepEqual(db, antes);
  });
});

describe('HU-14: eliminar grupo', () => {
  let db;
  beforeEach(() => {
    db = datosIniciales();
    supabase.rpc = rpcFalso(db);
  });

  const eliminar = (perfil, id) => peticion(perfil, 'eliminarGrupos', eliminarGrupo, { params: { id } });
  const grupo = (id) => db.groups.find((g) => g.id === id);
  const invitacion = (id) => db.invitations.find((i) => i.id === id);

  test('el Administrador elimina un grupo vacío y cancela sus invitaciones pendientes', async () => {
    const res = await eliminar(ADMIN, 'gVacio');
    assert.equal(res.statusCode, 200);
    assert.equal(grupo('gVacio'), undefined);
    // Solo cuentan las 2 pendientes; la aceptada no se cancela
    assert.equal(res.body.invitacionesCanceladas, 2);
  });

  test('no toca los demás grupos ni las invitaciones de otros grupos o empresas', async () => {
    await eliminar(ADMIN, 'gVacio');
    assert.ok(grupo('g1') && grupo('g2') && grupo('gDatos') && grupo('gA') && grupo('gX'));
    assert.equal(invitacion('iG1').status, 'pendiente');
    assert.equal(invitacion('iX').status, 'pendiente');
    assert.equal(db.user_group_role.length, 3);
  });

  test('un grupo con miembros no se elimina (409) y no se pierde nada', async () => {
    const antes = structuredClone(db);
    assert.equal((await eliminar(ADMIN, 'g1')).statusCode, 409);
    assert.deepEqual(db, antes);
  });

  test('un grupo sin miembros pero con contactos u oportunidades no se elimina (409)', async () => {
    const antes = structuredClone(db);
    assert.equal((await eliminar(ADMIN, 'gDatos')).statusCode, 409);
    assert.deepEqual(db, antes);
  });

  test('el Jefe de Área recibe 403 y no se pierden datos', async () => {
    const antes = structuredClone(db);
    assert.equal((await eliminar(JEFE, 'gVacio')).statusCode, 403);
    assert.deepEqual(db, antes);
  });

  test('el Agente recibe 403 y no se pierden datos', async () => {
    const antes = structuredClone(db);
    assert.equal((await eliminar(AGENTE, 'gVacio')).statusCode, 403);
    assert.deepEqual(db, antes);
  });

  test('un grupo de otra empresa o inexistente responde 404 sin cambios', async () => {
    const antes = structuredClone(db);
    assert.equal((await eliminar(ADMIN, 'gX')).statusCode, 404);
    assert.equal((await eliminar(ADMIN, 'no-existe')).statusCode, 404);
    assert.deepEqual(db, antes);
  });

  test('un id que no es UUID responde 404 en lugar de un error 500', async () => {
    supabase.rpc = async () => ({ data: null, error: { code: '22P02', message: 'invalid input syntax for type uuid' } });
    assert.equal((await eliminar(ADMIN, 'abc')).statusCode, 404);
  });
});