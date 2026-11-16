import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearLimitadorUsuario } from '../src/middlewares/limitarPeticiones.js';

const ejecutar = (limitar, id) => {
  let continua = false;
  const res = {
    headers: {},
    setHeader(nombre, valor) { this.headers[nombre] = valor; },
    status(codigo) { this.codigo = codigo; return this; },
    json(body) { this.body = body; return this; }
  };
  limitar({ user: id ? { id } : undefined }, res, () => { continua = true; });
  return { res, continua };
};

test('permite 100 peticiones y rechaza la 101 con 429 y Retry-After', () => {
  const limitar = crearLimitadorUsuario({ ahora: () => 0 });
  for (let i = 0; i < 100; i++) assert.equal(ejecutar(limitar, 'uno').continua, true);
  const { res, continua } = ejecutar(limitar, 'uno');
  assert.equal(continua, false);
  assert.equal(res.codigo, 429);
  assert.equal(res.headers['Retry-After'], '60');
  assert.equal(res.body.reintentarEnSegundos, 60);
  assert.equal(ejecutar(limitar, 'dos').continua, true);
});

test('desbloquea al vencer el minuto y calcula la espera restante', () => {
  let tiempo = 0;
  const limitar = crearLimitadorUsuario({ maximo: 1, ahora: () => tiempo });
  assert.equal(ejecutar(limitar, 'uno').continua, true);
  tiempo = 59_100;
  assert.equal(ejecutar(limitar, 'uno').res.headers['Retry-After'], '1');
  tiempo = 60_000;
  assert.equal(ejecutar(limitar, 'uno').continua, true);
});

test('no admite solicitudes sin identidad validada', () => {
  const { res, continua } = ejecutar(crearLimitadorUsuario());
  assert.equal(continua, false);
  assert.equal(res.codigo, 401);
});
