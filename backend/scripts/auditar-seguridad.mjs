// Auditoría local de solo lectura. Nunca imprime valores de claves ni contenido de .env.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const archivos = git('ls-files', '-z').split('\0');
let fallos = 0;
function comprobar(nombre, ok) { console.log(`${ok ? 'OK' : 'FALLO'}: ${nombre}`); if (!ok) fallos++; }
comprobar('no hay archivos .env reales versionados', !archivos.some(p => /(^|\/)\.env(?:\.|$)/.test(p) && !p.endsWith('.env.example')));
for (const path of ['backend/.env', 'frontend/.env']) {
  let ignorado = false;
  try { ignorado = !!git('check-ignore', path); } catch {}
  comprobar(`${path} ignorado por Git`, ignorado);
}
const historial = git('log', '--all', '--format=', '--name-only', '--', '**/.env', '.env');
console.log(historial ? 'PENDIENTE: hay .env en el historial; revisar y rotar credenciales históricas con el equipo.' : 'OK: no se encontraron .env en el historial consultado');

const backendEnv = existsSync(resolve(root, 'backend/.env')) ? dotenv.parse(readFileSync(resolve(root, 'backend/.env'))) : {};
const claves = Object.entries(backendEnv).filter(([k,v]) => /KEY|SECRET|TOKEN|PASSWORD/.test(k) && !/ANON|PUBLISHABLE/.test(k) && v.length > 16).map(([,v]) => v);
function archivosEn(dir) {
  return existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? archivosEn(resolve(dir, e.name)) : [resolve(dir, e.name)]) : [];
}
const frontend = [...archivos.filter(p => p.startsWith('frontend/') && !p.endsWith('package-lock.json')).map(p => resolve(root, p)),
  ...archivosEn(resolve(root, 'frontend/dist')),
  ...readdirSync(resolve(root, 'frontend')).filter(p => p.startsWith('.env')).map(p => resolve(root, 'frontend', p))];
for (const path of new Set(frontend)) {
  if (!existsSync(path)) continue;
  const texto = readFileSync(path, 'utf8');
  const jwtPrivilegiado = [...texto.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)].some(m => {
    try { return JSON.parse(Buffer.from(m[1], 'base64url').toString()).role === 'service_role'; } catch { return false; }
  });
  comprobar(`sin secretos backend en ${relative(root, path)}`, !claves.some(k => texto.includes(k)) && !jwtPrivilegiado && !/sb_secret_[A-Za-z0-9_-]+|SUPABASE_SERVICE_ROLE_KEY/.test(texto));
}
if (!existsSync(resolve(root, 'frontend/dist'))) console.log('PENDIENTE: generar frontend/dist para auditar el bundle.');
const sql = archivos.filter(p => p.startsWith('backend/db/migrations/') && p.endsWith('.sql')).map(p => readFileSync(resolve(root,p),'utf8')).join('\n').replace(/--[^\n]*/g, '');
const tablas = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.(\w+)/gi)].map(m=>m[1]);
for (const tabla of new Set(tablas)) comprobar(`migraciones activan RLS: ${tabla}`, new RegExp(`ALTER\\s+TABLE\\s+public\\.${tabla}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i').test(sql));
console.log('PENDIENTE: verificar el despliegue real con docs/hu19-verificar-rls.sql y usuarios de empresas distintas.');
process.exitCode = fallos ? 1 : 0;
