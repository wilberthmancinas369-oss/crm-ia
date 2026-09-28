import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { validationResult } from 'express-validator';

// Valores ficticios para que config/supabase.js no aborte; ninguna prueba sale a la red
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';

const { default: supabase } = await import('../src/config/supabase.js');
const { createGrupo } = await import('../src/controllers/grupos.controller.js');
const { validacionesGrupo } = await import('../src/routes/grupos.routes.js');

// Simula la cadena de consultas de Supabase: cada método devuelve la misma consulta
// y los finales (maybeSingle/single) resuelven con la respuesta configurada
const mockConsulta = ({ existente = null, creado = null } = {}) => {
  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    insert: () => consulta,
    maybeSingle: async () => ({ data: existente, error: null }),
    single: async () => ({ data: creado, error: null }),
  };
  return consulta;
};

const mockRes = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

describe('POST /api/grupos — controlador', () => {
  beforeEach(() => {
    supabase.from = () => mockConsulta({ creado: { id: '123', name: 'Nuevo Grupo' } });
  });

  test('crea el grupo y responde 201', async () => {
    const req = { body: { name: 'Nuevo Grupo', description: 'Desc' }, company_id: 'company-1' };
    const res = mockRes();

    await createGrupo(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.message, 'Grupo creado exitosamente');
    assert.equal(res.body.group.id, '123');
  });

  test('responde 409 si el nombre ya existe en la empresa', async () => {
    supabase.from = () => mockConsulta({ existente: { id: 'existe' } });
    const req = { body: { name: 'Existente' }, company_id: 'company-1' };
    const res = mockRes();

    await createGrupo(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error, 'Ya existe un grupo con este nombre en tu empresa');
  });
});

describe('POST /api/grupos — validaciones', () => {
  const validar = async (body) => {
    const req = { body };
    for (const regla of validacionesGrupo) await regla.run(req);
    return validationResult(req).array().map((e) => e.msg);
  };

  test('rechaza un grupo sin nombre', async () => {
    assert.deepEqual(await validar({ description: 'Sin nombre' }), ['El nombre del grupo es obligatorio']);
  });

  test('rechaza un nombre de más de 100 caracteres', async () => {
    assert.deepEqual(await validar({ name: 'a'.repeat(101) }), [
      'El nombre del grupo no puede exceder los 100 caracteres',
    ]);
  });

  test('acepta un nombre válido', async () => {
    assert.deepEqual(await validar({ name: 'Ventas Norte' }), []);
  });
});
