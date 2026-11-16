import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { configurarSeguridad } from '../src/middlewares/seguridad.js';

test('cabeceras, CORS y preflight sin ejecutar rutas desde un origen ajeno', async (t) => {
  const app = express();
  configurarSeguridad(app, { frontendUrl: 'http://localhost:5173/' });
  let llamadas = 0;
  app.all('/prueba', (req, res) => { llamadas++; res.json({ ok: true }); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const endpoint = `http://127.0.0.1:${server.address().port}/prueba`;
  const permitida = await fetch(endpoint, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(permitida.status, 200);
  assert.equal(permitida.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(permitida.headers.get('x-powered-by'), null);
  assert.equal(permitida.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(permitida.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.ok(permitida.headers.get('content-security-policy'));
  assert.ok(permitida.headers.get('strict-transport-security'));
  assert.equal(permitida.headers.get('referrer-policy'), 'no-referrer');
  assert.match(permitida.headers.get('access-control-expose-headers'), /Retry-After/i);
  for (const origin of ['https://malicioso.example', 'http://localhost:5173.evil.example', 'null']) {
    const respuesta = await fetch(endpoint, { method: 'POST', headers: { Origin: origin } });
    assert.equal(respuesta.status, 403);
    assert.equal(respuesta.headers.get('access-control-allow-origin'), null);
    assert.equal(respuesta.headers.get('x-content-type-options'), 'nosniff');
  }
  assert.equal(llamadas, 1);
  const preflight = await fetch(endpoint, { method: 'OPTIONS', headers: {
    Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PATCH',
    'Access-Control-Request-Headers': 'authorization,content-type',
  } });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('access-control-allow-methods'), /PATCH/);
  assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/i);
  assert.equal(llamadas, 1);
  assert.equal((await fetch(endpoint)).status, 200);
});

test('configuración inválida falla al arrancar en lugar de habilitar cualquier origen', () => {
  for (const frontendUrl of ['', '*', 'null', 'ftp://ejemplo.com', 'https://user:pass@ejemplo.com', 'https://ejemplo.com/ruta']) {
    assert.throws(() => configurarSeguridad(express(), { frontendUrl }), /FRONTEND_URL/);
  }
});
