// HU-9: editar o remover usuarios y cambiar grupo/rol; reenviar y cancelar invitaciones.
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseFalso } from './helpers/supabaseFalso.js';

// Valores ficticios para que config/supabase.js no aborte; ninguna prueba sale a la red
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';

const { default: supabase } = await import('../src/config/supabase.js');
const { NIVELES } = await import('../src/config/permisos.js');
const { perfilService } = await import('../src/services/perfil.service.js');
const { emailService } = await import('../src/services/email.service.js');
const { autorizar } = await import('../src/middlewares/autorizarRol.js');
const { usuarioController } = await import('../src/controllers/usuario.controller.js');
const { reenviarInvitacion, cancelarInvitacion } = await import('../src/controllers/invitaciones.controller.js');

// ---------- Escenario ----------
// Empresa c1: Ventas (g1), Soporte (g2) y Administración (gA). Empresa c2 aparte.
// Jefe de Ventas (solo g1), Agente en g1, otro Jefe en g1, Agente en g2 y el Administrador en gA.
const EMPRESA = 'c1';
const perfilDe = (id, grupos) => ({
  usuario: { id, nombre: id, email: `${id}@x.com` },
  empresa: { id: EMPRESA, nombre: 'Empresa Uno' },
  grupos: grupos.map(([grupo, nivel]) => ({ id: grupo, nombre: grupo, rol: String(nivel), nivel }))
});
const ADMIN = perfilDe('admin', [['gA', NIVELES.ADMINISTRADOR]]);
const JEFE = perfilDe('jefe', [['g1', NIVELES.JEFE_AREA]]);
const AGENTE = perfilDe('agente', [['g1', NIVELES.AGENTE]]);

const ROL = { rAgente: NIVELES.AGENTE, rJefe: NIVELES.JEFE_AREA, rAdmin: NIVELES.ADMINISTRADOR };
// Igual que la tabla real: sin columna id, la llave es (user_id, group_id)
const miembro = (user_id, group_id, role_id, company_id = EMPRESA) =>
  ({ user_id, group_id, role_id, company_id, roles: { level: ROL[role_id] } });

const datosIniciales = () => ({
  groups: [
    { id: 'g1', name: 'Ventas', company_id: EMPRESA },
    { id: 'g2', name: 'Soporte', company_id: EMPRESA },
    { id: 'gA', name: 'Administración', company_id: EMPRESA },
    { id: 'gX', name: 'Otra', company_id: 'c2' }
  ],
  roles: [
    { id: 'rAgente', name: 'Agente', level: NIVELES.AGENTE, company_id: EMPRESA },
    { id: 'rJefe', name: 'Jefe de Área', level: NIVELES.JEFE_AREA, company_id: EMPRESA },
    { id: 'rAdmin', name: 'Administrador', level: NIVELES.ADMINISTRADOR, company_id: EMPRESA }
  ],
  profiles: [
    { id: 'admin', company_id: EMPRESA }, { id: 'jefe', company_id: EMPRESA },
    { id: 'agente', company_id: EMPRESA }, { id: 'jefe2', company_id: EMPRESA },
    { id: 'agente2', company_id: EMPRESA }, { id: 'ajeno', company_id: 'c2' }
  ],
  user_group_role: [
    miembro('admin', 'gA', 'rAdmin'),
    miembro('jefe', 'g1', 'rJefe'),
    miembro('agente', 'g1', 'rAgente'),
    miembro('agente', 'g2', 'rAgente'),
    miembro('jefe2', 'g1', 'rJefe'),
    miembro('agente2', 'g2', 'rAgente'),
    miembro('ajeno', 'gX', 'rAgente', 'c2')
  ],
  tareas: [{ id: 't1', responsable_id: 'agente2', company_id: EMPRESA }],
  invitations: [
    { id: 'iG1', email: 'nuevo@x.com', status: 'pendiente', group_id: 'g1', company_id: EMPRESA, token: 'viejo',
      groups: { name: 'Ventas' }, roles: { name: 'Agente' } },
    { id: 'iG2', email: 'otro@x.com', status: 'pendiente', group_id: 'g2', company_id: EMPRESA, token: 't2',
      groups: { name: 'Soporte' }, roles: { name: 'Agente' } },
    { id: 'iAceptada', email: 'ya@x.com', status: 'aceptada', group_id: 'g1', company_id: EMPRESA, token: 't3',
      groups: { name: 'Ventas' }, roles: { name: 'Agente' } }
  ]
});

let db;
let borrados;
beforeEach(() => {
  db = datosIniciales();
  borrados = [];
  supabase.from = supabaseFalso(db);
  supabase.auth.admin.deleteUser = async (id) => { borrados.push(id); return { error: null }; };
  emailService.sendInvitation = async () => ({ success: true, data: {} });
});

const mockRes = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

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

const cambiarRol = (perfil, body) => peticion(perfil, 'gestionarMiembros', usuarioController.cambiarRol, { body });
const mover = (perfil, body) => peticion(perfil, 'gestionarMiembros', usuarioController.moverGrupo, { body });
const remover = (perfil, body) => peticion(perfil, 'gestionarMiembros', usuarioController.removerGrupo, { body });
const eliminar = (perfil, body) => peticion(perfil, 'administrarUsuarios', usuarioController.eliminarDeEmpresa, { body });
const membresia = (user_id, group_id) => db.user_group_role.find((m) => m.user_id === user_id && m.group_id === group_id);
const rolDe = (user_id, group_id) => membresia(user_id, group_id)?.role_id;

describe('HU-9: el Agente no administra usuarios', () => {
  test('recibe 403 en cambiar rol, mover, remover y eliminar', async () => {
    assert.equal((await cambiarRol(AGENTE, { userId: 'agente2', groupId: 'g2', roleId: 'rJefe' })).statusCode, 403);
    assert.equal((await mover(AGENTE, { userId: 'agente2', oldGroupId: 'g2', newGroupId: 'g1' })).statusCode, 403);
    assert.equal((await remover(AGENTE, { userId: 'agente2', groupId: 'g2' })).statusCode, 403);
    assert.equal((await eliminar(AGENTE, { userId: 'agente2' })).statusCode, 403);
  });
});

describe('HU-9: Jefe de Área, solo Agentes de su grupo', () => {
  test('no puede ascender a un Agente a Jefe de Área', async () => {
    const res = await cambiarRol(JEFE, { userId: 'agente', groupId: 'g1', roleId: 'rJefe' });
    assert.equal(res.statusCode, 403);
    assert.equal(rolDe('agente', 'g1'), 'rAgente');
  });

  test('no puede cambiar el rol de otro Jefe de su grupo', async () => {
    const res = await cambiarRol(JEFE, { userId: 'jefe2', groupId: 'g1', roleId: 'rAgente' });
    assert.equal(res.statusCode, 403);
    assert.equal(rolDe('jefe2', 'g1'), 'rJefe');
  });

  test('no puede tocar a usuarios de un grupo que no dirige', async () => {
    assert.equal((await remover(JEFE, { userId: 'agente2', groupId: 'g2' })).statusCode, 403);
    assert.equal((await mover(JEFE, { userId: 'agente2', oldGroupId: 'g2', newGroupId: 'g1' })).statusCode, 403);
  });

  test('no puede mover a un Agente a un grupo que no dirige', async () => {
    db.user_group_role = db.user_group_role.filter((m) => m !== membresia('agente', 'g2'));
    const res = await mover(JEFE, { userId: 'agente', oldGroupId: 'g1', newGroupId: 'g2' });
    assert.equal(res.statusCode, 403);
  });

  test('puede sacar a un Agente de su grupo si tiene otro grupo', async () => {
    const res = await remover(JEFE, { userId: 'agente', groupId: 'g1' });
    assert.equal(res.statusCode, 200);
    assert.equal(membresia('agente', 'g1'), undefined);
  });

  test('no puede eliminar usuarios de la empresa', async () => {
    assert.equal((await eliminar(JEFE, { userId: 'agente' })).statusCode, 403);
    assert.deepEqual(borrados, []);
  });

  test('responde 404 si el rol no existe en la empresa', async () => {
    const res = await cambiarRol(JEFE, { userId: 'agente', groupId: 'g1', roleId: 'rOtraEmpresa' });
    assert.equal(res.statusCode, 404);
  });
});

describe('HU-9: Administrador', () => {
  test('puede ascender a un Agente a Jefe de Área', async () => {
    const res = await cambiarRol(ADMIN, { userId: 'agente2', groupId: 'g2', roleId: 'rJefe' });
    assert.equal(res.statusCode, 200);
    assert.equal(rolDe('agente2', 'g2'), 'rJefe');
  });

  test('no puede asignar el rol Administrador por esta vía', async () => {
    const res = await cambiarRol(ADMIN, { userId: 'agente2', groupId: 'g2', roleId: 'rAdmin' });
    assert.equal(res.statusCode, 403);
  });

  test('no puede cambiarse el rol a sí mismo', async () => {
    const res = await cambiarRol(ADMIN, { userId: 'admin', groupId: 'gA', roleId: 'rJefe' });
    assert.equal(res.statusCode, 403);
  });

  test('mueve a un usuario de grupo conservando su rol', async () => {
    const res = await mover(ADMIN, { userId: 'agente2', oldGroupId: 'g2', newGroupId: 'g1' });
    assert.equal(res.statusCode, 200);
    assert.equal(membresia('agente2', 'g2'), undefined);
    assert.equal(rolDe('agente2', 'g1'), 'rAgente');
  });

  test('no mueve a un grupo donde el usuario ya está (409) ni a un grupo de otra empresa (404)', async () => {
    assert.equal((await mover(ADMIN, { userId: 'agente', oldGroupId: 'g1', newGroupId: 'g2' })).statusCode, 409);
    assert.equal((await mover(ADMIN, { userId: 'agente2', oldGroupId: 'g2', newGroupId: 'gX' })).statusCode, 404);
  });

  test('no remueve a alguien de su único grupo (409)', async () => {
    const res = await remover(ADMIN, { userId: 'agente2', groupId: 'g2' });
    assert.equal(res.statusCode, 409);
    assert.ok(membresia('agente2', 'g2'));
  });

  test('la empresa nunca se queda sin Administrador', async () => {
    // Otro administrador, que es el único además de él mismo
    db.user_group_role.push(miembro('jefe2', 'gA', 'rAdmin'));
    db.user_group_role = db.user_group_role.filter((m) => m !== membresia('admin', 'gA'));
    const res = await cambiarRol(perfilDe('admin', [['g1', NIVELES.ADMINISTRADOR]]), { userId: 'jefe2', groupId: 'gA', roleId: 'rJefe' });
    assert.equal(res.statusCode, 409);
    assert.equal(rolDe('jefe2', 'gA'), 'rAdmin');
  });

  test('elimina a un usuario de la empresa y le pasa sus tareas', async () => {
    const res = await eliminar(ADMIN, { userId: 'agente2' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(borrados, ['agente2']);
    assert.equal(db.tareas[0].responsable_id, 'admin');
    assert.equal(res.body.resultado.tareasReasignadas, 1);
  });

  test('no se elimina a sí mismo ni a usuarios de otra empresa', async () => {
    assert.equal((await eliminar(ADMIN, { userId: 'admin' })).statusCode, 403);
    assert.equal((await eliminar(ADMIN, { userId: 'ajeno' })).statusCode, 404);
    assert.equal((await eliminar(ADMIN, { userId: 'no-existe' })).statusCode, 404);
    assert.deepEqual(borrados, []);
  });
});

describe('HU-9: reenviar y cancelar invitaciones', () => {
  const reenviar = (perfil, id) => peticion(perfil, 'gestionarInvitaciones', reenviarInvitacion, { params: { id } });
  const cancelar = (perfil, id) => peticion(perfil, 'gestionarInvitaciones', cancelarInvitacion, { params: { id } });
  const invitacion = (id) => db.invitations.find((i) => i.id === id);

  test('el Jefe reenvía una invitación de su grupo con un enlace nuevo', async () => {
    const res = await reenviar(JEFE, 'iG1');
    assert.equal(res.statusCode, 200);
    assert.notEqual(invitacion('iG1').token, 'viejo');
    assert.equal(invitacion('iG1').status, 'pendiente');
  });

  test('el Jefe no gestiona invitaciones de otro grupo', async () => {
    assert.equal((await reenviar(JEFE, 'iG2')).statusCode, 403);
    assert.equal((await cancelar(JEFE, 'iG2')).statusCode, 403);
    assert.equal(invitacion('iG2').status, 'pendiente');
  });

  test('cancelar marca la invitación como cancelada', async () => {
    const res = await cancelar(ADMIN, 'iG2');
    assert.equal(res.statusCode, 200);
    assert.equal(invitacion('iG2').status, 'cancelada');
  });

  test('una invitación aceptada no se reenvía ni se cancela (409)', async () => {
    assert.equal((await reenviar(ADMIN, 'iAceptada')).statusCode, 409);
    assert.equal((await cancelar(ADMIN, 'iAceptada')).statusCode, 409);
  });

  test('el Agente no gestiona invitaciones', async () => {
    assert.equal((await cancelar(AGENTE, 'iG1')).statusCode, 403);
  });
});
