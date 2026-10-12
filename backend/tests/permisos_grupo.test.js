// HU-11: el Jefe de Área solo tiene permisos dentro de su propio grupo (docs/HU11-matriz-permisos.md)
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseFalso } from './helpers/supabaseFalso.js';

// Valores ficticios para que config/supabase.js no aborte; ninguna prueba sale a la red
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';

const { default: supabase } = await import('../src/config/supabase.js');
const { NIVELES, puedeGestionarMiembro, rolMaximoAsignable } = await import('../src/config/permisos.js');
const { perfilService } = await import('../src/services/perfil.service.js');
const { emailService } = await import('../src/services/email.service.js');
const { autorizar } = await import('../src/middlewares/autorizarRol.js');
const { autorizarGrupo } = await import('../src/middlewares/autorizarGrupo.js');
const contactos = await import('../src/controllers/contactos.controller.js');
const oportunidades = await import('../src/controllers/oportunidades.controller.js');
const grupos = await import('../src/controllers/grupos.controller.js');
const { invitarUsuario } = await import('../src/controllers/invitaciones.controller.js');

// ---------- Escenario ----------
// Empresa c1 con dos grupos: Ventas (g1) y Soporte (g2), más Administración (gA).
// Jefe de Ventas: solo g1. Administrador: en gA, alcance de empresa.
const EMPRESA = 'c1';
const perfilDe = (id, grupos) => ({
  usuario: { id, nombre: id, email: `${id}@x.com` },
  empresa: { id: EMPRESA, nombre: 'Empresa Uno' },
  grupos: grupos.map(([grupo, nivel]) => ({ id: grupo, nombre: grupo, rol: String(nivel), nivel }))
});
const JEFE_VENTAS = perfilDe('jefe', [['g1', NIVELES.JEFE_AREA]]);
const ADMIN = perfilDe('admin', [['gA', NIVELES.ADMINISTRADOR]]);

const datosIniciales = () => ({
  groups: [
    { id: 'g1', name: 'Ventas', company_id: EMPRESA },
    { id: 'g2', name: 'Soporte', company_id: EMPRESA },
    { id: 'gA', name: 'Administración', company_id: EMPRESA }
  ],
  roles: [
    { id: 'rAgente', name: 'Agente', level: NIVELES.AGENTE, company_id: EMPRESA },
    { id: 'rJefe', name: 'Jefe de Área', level: NIVELES.JEFE_AREA, company_id: EMPRESA },
    { id: 'rAdmin', name: 'Administrador', level: NIVELES.ADMINISTRADOR, company_id: EMPRESA }
  ],
  contactos: [
    { id: 'kVentas', nombre: 'Cliente de Ventas', group_id: 'g1', company_id: EMPRESA },
    { id: 'kSoporte', nombre: 'Cliente de Soporte', group_id: 'g2', company_id: EMPRESA }
  ],
  oportunidades: [],
  profiles: [],
  invitations: []
});

let db;
beforeEach(() => {
  db = datosIniciales();
  supabase.from = supabaseFalso(db);
  emailService.sendInvitation = async () => ({ success: true, data: {} });
});

// ---------- Ejecuta una cadena de middlewares + controlador como lo haría Express ----------
const mockRes = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

async function peticion(perfil, cadena, { params = {}, body = {}, query = {} } = {}) {
  perfilService.obtener = async () => perfil;
  const req = { user: { id: perfil.usuario.id }, params, body, query };
  const res = mockRes();
  for (const paso of cadena) {
    let siguio = false;
    await paso(req, res, () => { siguio = true; });
    if (!siguio) break;
  }
  return res;
}

const CRM = [autorizar('gestionarCRM')];

// ---------- 1. Fuera de su grupo se le niega ----------
describe('Un Jefe no puede ver ni modificar datos de otro grupo', () => {
  test('la lista de contactos solo trae los de su grupo', async () => {
    const res = await peticion(JEFE_VENTAS, [...CRM, contactos.getContactos]);
    assert.deepEqual(res.body.map((c) => c.id), ['kVentas']);
  });

  test('ver un contacto de otro grupo responde 404', async () => {
    const res = await peticion(JEFE_VENTAS, [...CRM, contactos.getContactoById], { params: { id: 'kSoporte' } });
    assert.equal(res.statusCode, 404);
  });

  test('editar un contacto de otro grupo responde 404 y no lo cambia', async () => {
    const res = await peticion(JEFE_VENTAS, [...CRM, contactos.updateContacto], {
      params: { id: 'kSoporte' }, body: { nombre: 'Hackeado' }
    });
    assert.equal(res.statusCode, 404);
    assert.equal(db.contactos.find((c) => c.id === 'kSoporte').nombre, 'Cliente de Soporte');
  });

  test('borrar un contacto de otro grupo responde 404 y no lo borra', async () => {
    const res = await peticion(JEFE_VENTAS, [...CRM, contactos.deleteContacto], { params: { id: 'kSoporte' } });
    assert.equal(res.statusCode, 404);
    assert.ok(db.contactos.some((c) => c.id === 'kSoporte'));
  });

  test('crear un contacto en otro grupo responde 403', async () => {
    const res = await peticion(JEFE_VENTAS, [...CRM, contactos.createContacto], { body: { nombre: 'Nuevo', grupo_id: 'g2' } });
    assert.equal(res.statusCode, 403);
  });

  test('crear una oportunidad ligada a un contacto de otro grupo responde 404', async () => {
    const res = await peticion(JEFE_VENTAS, [...CRM, oportunidades.createOportunidad], {
      body: { nombre_oportunidad: 'Venta', contacto_id: 'kSoporte' }
    });
    assert.equal(res.statusCode, 404);
    assert.equal(db.oportunidades.length, 0);
  });

  test('la lista de grupos solo trae el suyo', async () => {
    const res = await peticion(JEFE_VENTAS, [autorizar('verGrupos'), grupos.listGrupos]);
    assert.deepEqual(res.body.map((g) => g.id), ['g1']);
  });

  test('invitar a otro grupo responde 403', async () => {
    const res = await peticion(JEFE_VENTAS, [autorizar('invitarUsuarios'), autorizarGrupo('id'), invitarUsuario], {
      params: { id: 'g2' }, body: { email: 'nuevo@x.com', role_id: 'rAgente' }
    });
    assert.equal(res.statusCode, 403);
    assert.equal(db.invitations.length, 0);
  });
});

// ---------- 2. Funciones exclusivas del Administrador ----------
describe('Un Jefe no puede usar funciones exclusivas del Administrador', () => {
  test('crear un grupo responde 403', async () => {
    const res = await peticion(JEFE_VENTAS, [autorizar('crearGrupos'), grupos.createGrupo], { body: { name: 'Nuevo' } });
    assert.equal(res.statusCode, 403);
    assert.equal(db.groups.length, 3);
  });

  test('ver el reporte general responde 403', async () => {
    // El endpoint del reporte es de otra HU; el permiso que lo protegerá ya niega al Jefe
    const res = await peticion(JEFE_VENTAS, [autorizar('verReporteGeneral')]);
    assert.equal(res.statusCode, 403);
  });

  test('administrar usuarios de la empresa responde 403', async () => {
    const res = await peticion(JEFE_VENTAS, [autorizar('administrarUsuarios')]);
    assert.equal(res.statusCode, 403);
  });
});

// ---------- 3. Sin escalada de privilegios ----------
describe('Un Jefe no puede asignar el rol Administrador ni escalar privilegios', () => {
  const invitarEnVentas = (role_id) => peticion(JEFE_VENTAS, [autorizar('invitarUsuarios'), autorizarGrupo('id'), invitarUsuario], {
    params: { id: 'g1' }, body: { email: 'nuevo@x.com', role_id }
  });

  test('invitar con rol Administrador responde 403', async () => {
    const res = await invitarEnVentas('rAdmin');
    assert.equal(res.statusCode, 403);
    assert.equal(db.invitations.length, 0);
  });

  test('invitar con rol Jefe de Área responde 403 (por defecto solo asigna Agente)', async () => {
    const res = await invitarEnVentas('rJefe');
    assert.equal(res.statusCode, 403);
  });

  test('no puede asignarse a sí mismo ni a otro el rol Administrador', () => {
    const agente = { id: 'u2', nivel: NIVELES.AGENTE };
    assert.equal(puedeGestionarMiembro(JEFE_VENTAS, 'g1', { id: 'jefe', nivel: NIVELES.JEFE_AREA }, NIVELES.ADMINISTRADOR), false);
    assert.equal(puedeGestionarMiembro(JEFE_VENTAS, 'g1', agente, NIVELES.ADMINISTRADOR), false);
    assert.equal(puedeGestionarMiembro(JEFE_VENTAS, 'g1', agente, NIVELES.JEFE_AREA), false);
  });

  test('no puede modificar ni sacar a un Administrador u otro Jefe', () => {
    assert.equal(puedeGestionarMiembro(JEFE_VENTAS, 'g1', { id: 'otroAdmin', nivel: NIVELES.ADMINISTRADOR }, null), false);
    assert.equal(puedeGestionarMiembro(JEFE_VENTAS, 'g1', { id: 'otroJefe', nivel: NIVELES.JEFE_AREA }, NIVELES.AGENTE), false);
  });

  test('la lista de roles que puede asignar solo trae Agente', async () => {
    const { listRolesInvitables } = await import('../src/controllers/roles.controller.js');
    const res = await peticion(JEFE_VENTAS, [autorizar('invitarUsuarios'), listRolesInvitables], { query: { grupo_id: 'g1' } });
    assert.deepEqual(res.body.map((r) => r.name), ['Agente']);
  });
});

// ---------- 4. Dentro de su grupo sí funciona ----------
describe('Un Jefe administra a su gente dentro de su grupo', () => {
  test('invita a un Agente a su grupo', async () => {
    const res = await peticion(JEFE_VENTAS, [autorizar('invitarUsuarios'), autorizarGrupo('id'), invitarUsuario], {
      params: { id: 'g1' }, body: { email: 'nuevo@x.com', role_id: 'rAgente' }
    });
    assert.equal(res.statusCode, 201);
    assert.equal(db.invitations[0].group_id, 'g1');
  });

  test('puede cambiar a un Agente de su grupo (sigue como Agente) y sacarlo del grupo', () => {
    const agente = { id: 'u2', nivel: NIVELES.AGENTE };
    assert.equal(puedeGestionarMiembro(JEFE_VENTAS, 'g1', agente, NIVELES.AGENTE), true);
    assert.equal(puedeGestionarMiembro(JEFE_VENTAS, 'g1', agente, null), true);
  });

  test('no puede mover a un Agente de otro grupo', () => {
    assert.equal(puedeGestionarMiembro(JEFE_VENTAS, 'g2', { id: 'u3', nivel: NIVELES.AGENTE }, null), false);
  });

  test('crea contactos en su grupo sin indicarlo (tiene uno solo)', async () => {
    const res = await peticion(JEFE_VENTAS, [...CRM, contactos.createContacto], { body: { nombre: 'Nuevo' } });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.group_id, 'g1');
  });
});

// ---------- 5. El Administrador conserva todos sus permisos ----------
describe('El Administrador conserva todos sus permisos', () => {
  test('ve los contactos de todos los grupos', async () => {
    const res = await peticion(ADMIN, [...CRM, contactos.getContactos]);
    assert.deepEqual(res.body.map((c) => c.id).sort(), ['kSoporte', 'kVentas']);
  });

  test('edita un contacto de cualquier grupo', async () => {
    const res = await peticion(ADMIN, [...CRM, contactos.updateContacto], { params: { id: 'kSoporte' }, body: { nombre: 'Editado' } });
    assert.equal(res.statusCode, 200);
    assert.equal(db.contactos.find((c) => c.id === 'kSoporte').nombre, 'Editado');
  });

  test('crea grupos', async () => {
    const res = await peticion(ADMIN, [autorizar('crearGrupos'), grupos.createGrupo], { body: { name: 'Marketing' } });
    assert.equal(res.statusCode, 201);
  });

  test('invita como Jefe de Área a cualquier grupo, pero no como Administrador', async () => {
    const cadena = [autorizar('invitarUsuarios'), autorizarGrupo('id'), invitarUsuario];
    const jefe = await peticion(ADMIN, cadena, { params: { id: 'g2' }, body: { email: 'jefe@x.com', role_id: 'rJefe' } });
    assert.equal(jefe.statusCode, 201);
    const admin = await peticion(ADMIN, cadena, { params: { id: 'g2' }, body: { email: 'otro@x.com', role_id: 'rAdmin' } });
    assert.equal(admin.statusCode, 403);
  });

  test('tiene los permisos exclusivos (reporte general, administrar usuarios, eliminar grupos)', async () => {
    for (const permiso of ['verReporteGeneral', 'administrarUsuarios', 'eliminarGrupos']) {
      const res = await peticion(ADMIN, [autorizar(permiso), (req, r) => r.json({ alcance: req.alcance })]);
      assert.equal(res.statusCode, 200, permiso);
      assert.equal(res.body.alcance, null, permiso);
    }
  });

  test('gestiona a cualquier miembro, incluido un Jefe, y asigna hasta Jefe de Área', () => {
    assert.equal(rolMaximoAsignable(ADMIN, 'g2'), NIVELES.JEFE_AREA);
    assert.equal(puedeGestionarMiembro(ADMIN, 'g2', { id: 'jefe', nivel: NIVELES.JEFE_AREA }, NIVELES.AGENTE), true);
  });
});
