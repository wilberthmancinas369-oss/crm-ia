// HU 4.1: refinar contactos y oportunidades (docs/HU4.1-contactos-oportunidades.md)
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { validationResult } from 'express-validator';
import { supabaseFalso } from './helpers/supabaseFalso.js';

// Valores ficticios para que config/supabase.js no aborte; ninguna prueba sale a la red
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';

const { default: supabase } = await import('../src/config/supabase.js');
const { NIVELES } = await import('../src/config/permisos.js');
const { perfilService } = await import('../src/services/perfil.service.js');
const { autorizar } = await import('../src/middlewares/autorizarRol.js');
const op = await import('../src/controllers/oportunidades.controller.js');
const contactos = await import('../src/controllers/contactos.controller.js');
const { validacionesCrear } = await import('../src/routes/oportunidades.routes.js');

// ---------- Escenario ----------
// Empresa c1, grupo Ventas (g1): Jefe "jefe", Agentes "ana" y "beto". Administrador "admin" en gA.
// "otro" es Agente de Soporte (g2). Empresa c2 tiene su propio contacto.
const perfilDe = (id, grupos, empresa = 'c1') => ({
  usuario: { id, nombre: id, email: `${id}@x.com` },
  empresa: { id: empresa, nombre: empresa },
  grupos: grupos.map(([grupo, nivel]) => ({ id: grupo, nombre: grupo, rol: String(nivel), nivel }))
});
const JEFE = perfilDe('jefe', [['g1', NIVELES.JEFE_AREA]]);
const ANA = perfilDe('ana', [['g1', NIVELES.AGENTE]]);
const BETO = perfilDe('beto', [['g1', NIVELES.AGENTE]]);
const ADMIN = perfilDe('admin', [['gA', NIVELES.ADMINISTRADOR]]);

const miembro = (user_id, group_id, level) => ({
  user_id, group_id, company_id: 'c1', roles: { level }, profiles: { id: user_id, full_name: user_id, email: `${user_id}@x.com` }
});

const datosIniciales = () => ({
  user_group_role: [
    miembro('jefe', 'g1', NIVELES.JEFE_AREA),
    miembro('ana', 'g1', NIVELES.AGENTE),
    miembro('beto', 'g1', NIVELES.AGENTE),
    miembro('otro', 'g2', NIVELES.AGENTE),
    miembro('admin', 'gA', NIVELES.ADMINISTRADOR)
  ],
  contactos: [
    { id: 'kVentas', nombre: 'Cliente', group_id: 'g1', company_id: 'c1' },
    { id: 'kOtraEmpresa', nombre: 'Ajeno', group_id: 'gX', company_id: 'c2' }
  ],
  oportunidades: [
    { id: 'oAna', nombre_oportunidad: 'Venta de Ana', contacto_id: 'kVentas', group_id: 'g1', company_id: 'c1', responsable_id: 'ana', etapa: 'Propuesta' }
  ],
  oportunidad_colaboradores: []
});

let db;
beforeEach(() => {
  db = datosIniciales();
  supabase.from = supabaseFalso(db);
});

const mockRes = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

// Ejecuta autorizar('gestionarCRM') + controlador, como la ruta real
async function peticion(perfil, controlador, { params = {}, body = {} } = {}) {
  perfilService.obtener = async () => perfil;
  const req = { user: { id: perfil.usuario.id }, params, body, query: {} };
  const res = mockRes();
  let siguio = false;
  await autorizar('gestionarCRM')(req, res, () => { siguio = true; });
  if (siguio) await controlador(req, res);
  return res;
}

const validar = async (body) => {
  const req = { body };
  for (const regla of validacionesCrear) await regla.run(req);
  return validationResult(req).array().map((e) => e.msg);
};

describe('Cada empresa solo ve lo suyo', () => {
  test('el Administrador de una empresa no ve contactos de otra empresa', async () => {
    const lista = await peticion(ADMIN, contactos.getContactos);
    assert.deepEqual(lista.body.map((c) => c.id), ['kVentas']);
    const ajeno = await peticion(ADMIN, contactos.getContactoById, { params: { id: 'kOtraEmpresa' } });
    assert.equal(ajeno.statusCode, 404);
  });

  test('no se puede crear una oportunidad con un contacto de otra empresa', async () => {
    const res = await peticion(ADMIN, op.createOportunidad, { body: { nombre_oportunidad: 'X', contacto_id: 'kOtraEmpresa' } });
    assert.equal(res.statusCode, 404);
  });
});

describe('Modelo de oportunidades', () => {
  test('el contacto es obligatorio', async () => {
    assert.ok((await validar({ nombre_oportunidad: 'Venta' })).includes('El contacto es obligatorio'));
  });

  test('solo acepta etapas del pipeline', async () => {
    const errores = await validar({ nombre_oportunidad: 'Venta', contacto_id: crypto.randomUUID(), etapa: 'Prospecto' });
    assert.ok(errores.some((m) => m.startsWith('La etapa debe ser una de')));
  });

  test('el monto no puede ser negativo', async () => {
    const errores = await validar({ nombre_oportunidad: 'Venta', contacto_id: crypto.randomUUID(), valor_estimado: -5 });
    assert.ok(errores.includes('El monto debe ser un número mayor o igual a 0'));
  });

  test('una oportunidad válida pasa la validación', async () => {
    assert.deepEqual(await validar({
      nombre_oportunidad: 'Venta', contacto_id: crypto.randomUUID(), valor_estimado: 1500, etapa: 'Negociación', fecha_cierre_prevista: '2026-12-01'
    }), []);
  });

  test('al crearla toma el grupo del contacto y quien la crea queda como responsable', async () => {
    const res = await peticion(ANA, op.createOportunidad, { body: { nombre_oportunidad: 'Nueva', contacto_id: 'kVentas' } });
    assert.equal(res.statusCode, 201);
    const creada = db.oportunidades.find((o) => o.nombre_oportunidad === 'Nueva');
    assert.equal(creada.group_id, 'g1');
    assert.equal(creada.responsable_id, 'ana');
  });
});

describe('Responsable de la oportunidad', () => {
  test('un Agente no puede asignar a otra persona como responsable', async () => {
    const res = await peticion(ANA, op.createOportunidad, { body: { nombre_oportunidad: 'N', contacto_id: 'kVentas', responsable_id: 'beto' } });
    assert.equal(res.statusCode, 403);
  });

  test('un Agente no puede reasignar una oportunidad', async () => {
    const res = await peticion(ANA, op.updateOportunidad, { params: { id: 'oAna' }, body: { responsable_id: 'beto' } });
    assert.equal(res.statusCode, 403);
    assert.equal(db.oportunidades[0].responsable_id, 'ana');
  });

  test('el Jefe de Área reasigna a un miembro de su grupo', async () => {
    const res = await peticion(JEFE, op.updateOportunidad, { params: { id: 'oAna' }, body: { responsable_id: 'beto' } });
    assert.equal(res.statusCode, 200);
    assert.equal(db.oportunidades[0].responsable_id, 'beto');
  });

  test('el responsable debe ser del grupo de la oportunidad', async () => {
    const res = await peticion(JEFE, op.updateOportunidad, { params: { id: 'oAna' }, body: { responsable_id: 'otro' } });
    assert.equal(res.statusCode, 400);
  });

  test('cambiar la etapa no exige permisos extra', async () => {
    const res = await peticion(BETO, op.updateOportunidad, { params: { id: 'oAna' }, body: { etapa: 'Ganada' } });
    assert.equal(res.statusCode, 200);
    assert.equal(db.oportunidades[0].etapa, 'Ganada');
  });
});

describe('Colaboradores de una oportunidad', () => {
  const agregar = (perfil, user_id) => peticion(perfil, op.addColaborador, { params: { id: 'oAna' }, body: { user_id } });

  test('el responsable agrega a un compañero de su grupo', async () => {
    const res = await agregar(ANA, 'beto');
    assert.equal(res.statusCode, 201);
    assert.deepEqual(db.oportunidad_colaboradores.map((c) => c.user_id), ['beto']);
  });

  test('un Agente que no es responsable no puede agregar colaboradores', async () => {
    assert.equal((await agregar(BETO, 'jefe')).statusCode, 403);
  });

  test('el Jefe de Área puede agregar colaboradores a oportunidades de su grupo', async () => {
    assert.equal((await agregar(JEFE, 'beto')).statusCode, 201);
  });

  test('no se puede agregar a alguien de otro grupo', async () => {
    assert.equal((await agregar(ANA, 'otro')).statusCode, 400);
  });

  test('no se puede agregar dos veces ni agregar al responsable', async () => {
    await agregar(ANA, 'beto');
    assert.equal((await agregar(ANA, 'beto')).statusCode, 409);
    assert.equal((await agregar(JEFE, 'ana')).statusCode, 400);
  });

  test('un colaborador puede salirse por su cuenta', async () => {
    await agregar(ANA, 'beto');
    const res = await peticion(BETO, op.removeColaborador, { params: { id: 'oAna', userId: 'beto' } });
    assert.equal(res.statusCode, 200);
    assert.equal(db.oportunidad_colaboradores.length, 0);
  });
});

describe('Contactos', () => {
  test('no se puede borrar un contacto que tiene oportunidades', async () => {
    // La base responde con violación de llave foránea (ON DELETE RESTRICT de la migración)
    const consulta = { delete: () => consulta, eq: () => consulta, in: () => consulta, select: async () => ({ data: null, error: { code: '23503' } }) };
    supabase.from = () => consulta;
    const res = await peticion(ANA, contactos.deleteContacto, { params: { id: 'kVentas' } });
    assert.equal(res.statusCode, 409);
  });

  test('las redes sociales solo aceptan redes conocidas y URLs completas', async () => {
    const { default: router } = await import('../src/routes/contactos.routes.js');
    const reglas = router.stack.find((capa) => capa.route?.path === '/' && capa.route.methods.post).route.stack.map((c) => c.handle);
    const validarContacto = async (body) => {
      const req = { body };
      for (const regla of reglas.slice(0, -2)) if (regla.run) await regla.run(req);
      return { errores: validationResult(req).array().map((e) => e.msg), body: req.body };
    };

    assert.ok((await validarContacto({ nombre: 'A', redes_sociales: { tiktok: 'https://t.com' } })).errores.some((m) => m.includes('no permitida')));
    assert.ok((await validarContacto({ nombre: 'A', redes_sociales: { linkedin: 'linkedin.com/in/a' } })).errores.some((m) => m.includes('URL completa')));

    const valido = await validarContacto({ nombre: 'A', redes_sociales: { linkedin: 'https://linkedin.com/in/a', x: '' } });
    assert.deepEqual(valido.errores, []);
    assert.deepEqual(valido.body.redes_sociales, { linkedin: 'https://linkedin.com/in/a' });
  });
});
