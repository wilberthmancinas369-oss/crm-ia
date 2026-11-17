// Pruebas explícitas contra el proyecto configurado. Nunca imprime claves.
// --login-rate-limit genera hasta 35 intentos inválidos y puede limitar temporalmente esta IP.
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
const frontend = dotenv.parse(readFileSync(new URL('../../frontend/.env', import.meta.url)));
const backend = dotenv.parse(readFileSync(new URL('../.env', import.meta.url)));
const url = frontend.VITE_SUPABASE_URL?.replace(/\/$/, '');
if (!url || url !== backend.SUPABASE_URL?.replace(/\/$/, '')) throw new Error('Proyectos frontend/backend distintos o sin configurar');
const key = frontend.VITE_SUPABASE_ANON_KEY;
if (!key || key.startsWith('sb_secret_')) throw new Error('Falta clave pública válida');
try {
  if (JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'service_role') throw new Error('No usar service_role');
} catch (error) { if (error.message === 'No usar service_role') throw error; }
let fallos = 0;
for (const tabla of ['profiles','user_group_role','contactos','oportunidades','tareas']) {
  const res = await fetch(`${url}/rest/v1/${tabla}?select=*&limit=0`, {
    headers: { apikey: key }, signal: AbortSignal.timeout(15000),
  });
  const body = await res.json();
  const ok = [401,403].includes(res.status) && body.code === '42501';
  console.log(`${ok ? 'OK' : 'FALLO'} acceso anónimo ${tabla}: HTTP ${res.status}, código ${body.code || 'sin código'}`);
  if (!ok) fallos++;
}
if (process.argv.includes('--login-rate-limit')) {
  let bloqueado = false;
  for (let intento = 1; intento <= 35; intento++) {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hu19-prueba-inexistente@example.invalid', password: 'Ficticia-HU19-no-es-una-clave-real' }),
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json();
    console.log(`Intento ${intento}: HTTP ${res.status}, código ${body.error_code || body.code || 'sin código'}`);
    if (res.status === 429) { bloqueado = true; break; }
    if (res.status !== 400 || body.error_code !== 'invalid_credentials') {
      fallos++; break; // No continuar ante respuestas inesperadas.
    }
  }
  console.log(bloqueado ? 'OK: Supabase rechazó la ráfaga con 429' : 'PENDIENTE: no se observó 429 dentro de la prueba acotada');
  if (!bloqueado) fallos++;
}
process.exitCode = fallos ? 1 : 0;
