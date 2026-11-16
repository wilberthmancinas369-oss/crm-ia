# HU19 — Seguridad: alcance de Daniel

## Cambios

- Helmet aplica sus cabeceras por defecto antes de las rutas, incluso en rechazos CORS: CSP, HSTS, protección contra MIME sniffing, política de referrer y protección de frames; elimina X-Powered-By.
- CORS permite únicamente el origen de `FRONTEND_URL`. Es obligatorio configurar una URL HTTP(S) sin ruta, usuario, contraseña, query ni fragmento. Ejemplo local: `http://localhost:5173`. En despliegue debe ser el origen HTTPS real del frontend.
- Un Origin diferente (incluido `null`) recibe 403 antes de ejecutar la ruta. Se permiten preflight con Authorization y Content-Type. Retry-After es legible por el frontend para integrarse con el limitador de Juventino.
- Las llamadas sin Origin siguen admitidas para clientes de servidor; las rutas conservan autenticación y autorización. CORS no impide llamadas desde curl ni sustituye permisos por empresa. Helmet no configura TLS: HTTPS debe configurarse en el alojamiento.
- Auditoría reproducible de archivos versionados, configuración local, bundle y migraciones: `node backend/scripts/auditar-seguridad.mjs`, desde la raíz. No imprime claves. La búsqueda compara secretos configurados del backend y detecta claves Supabase privilegiadas; no garantiza detectar cualquier secreto desconocido.
- Consulta de solo lectura para el despliegue: `docs/hu19-verificar-rls.sql`.

## Verificación realizada

Base: origin/main `4004fd21e41af5b27b581ce4747b7c482d900fd7`, rama de trabajo `hu19-seguridad-daniel`.

| Comprobación | Resultado |
|---|---|
| `npm test` en backend después de integrar a Juventino | 268 pruebas aprobadas, 0 fallos |
| Nuevas pruebas `seguridad_http.test.js` | Cabeceras; origen permitido; tres orígenes rechazados sin ejecutar la ruta; preflight; cliente sin Origin; configuración inválida |
| Aislamiento existente con Supabase simulado | Suite completa aprobada: contactos/oportunidades, filtros, tareas/equipo, grupos, reportes, usuarios e IA incluyen casos de otra empresa |
| `npm run build` en frontend | Correcto; advertencia de bundle mayor a 500 kB |
| Auditoría local después del build | Sin secretos privados detectados en frontend ni dist; `.env` locales ignorados; solo ejemplos versionados |
| Migraciones | Las 12 tablas públicas creadas contienen activación de RLS; no prueba que estén aplicadas en el servidor |
| Pruebas del limitador de Juventino | 3 aprobadas; incluidas en las 268 pruebas posteriores al merge |

Las pruebas HTTP locales necesitaron ejecutarse fuera del sandbox porque este rechazaba conexiones a 127.0.0.1 con EACCES. No fueron fallos del CRM. No se enviaron correos ni llamadas a Gemini durante las pruebas simuladas.

## Dependencia del trabajo de Juventino

Rama revisada: `HU-Mejorar-la-seguridad-del-sistema-juventino`, commit `b8589874af0d2a55da9dcedd8f86f1ba6da6a670`.
Integrada sin conflictos en `hu19-seguridad-daniel` mediante el merge `0feb50e`, después de guardar el trabajo de Daniel en `d31d8e6`. No se modificaron main ni la rama de Juventino. Se repitieron la suite completa, el build del frontend y la auditoría local con ambos trabajos integrados. La rama de Juventino elimina frontend/.env.example; los archivos .env locales se conservaron y siguen ignorados.
Su middleware limita 100 peticiones por minuto por usuario autenticado, responde 429 con Retry-After y reinicia la ventana. Sus pruebas comprueban el intento 101, independencia entre usuarios, expiración y rechazo sin identidad.

**Eso no prueba el límite de intentos de login.** El frontend llama `supabase.auth.signInWithPassword` directamente; el limitador se ejecuta después de validar el JWT en el backend. La protección de login debe verificarse en Supabase Auth con una cuenta de prueba, sin intentar bloquear una cuenta real. No se duplicó ni alteró el trabajo de contraseñas y rate limit.

## Pendientes para cerrar la verificación

1. Ejecutar el SQL de auditoría en el proyecto correcto de Supabase. Confirmar cero tablas públicas con RLS desactivado y revisar las políticas, vistas y funciones privilegiadas. No se aplicó ninguna migración a la base real en esta entrega.
2. Las políticas versionadas usan `get_my_company_id()` que consulta `profiles`, cuya política llama a esa misma función; hay riesgo de recursión RLS. Además, varias políticas de datos filtran empresa, no grupo. Revisar la definición desplegada y probar acceso directo con JWT de usuarios reales antes de declarar cerrado el aislamiento. El backend usa service_role y evita RLS, por eso las pruebas simuladas del backend no demuestran las políticas de PostgreSQL.
3. Con dos cuentas de prueba de empresas diferentes: comprobar listado y acceso por ID a datos ajenos a través del backend y de la Data API usando la clave pública y el JWT del usuario (nunca service_role). Esperar ausencia de datos ajenos o rechazo; una respuesta 500 por recursión no cuenta como aprobación. Comprobar también aislamiento de grupos.
4. Verificar límites de Supabase Auth y realizar intentos fallidos controlados con una cuenta de prueba, registrando umbral, respuesta y recuperación. Pendiente; no se afirmó que los tres tests de Juventino cubran login.
5. **Hay archivos `.env` en el historial de Git**, aunque ya no estén en el índice actual. Coordinar revisión y rotación de las credenciales históricas con el equipo; no basta con ignorar los archivos. No se imprimieron sus valores ni se reescribió el historial compartido.
6. La instalación de Helmet informó 4 avisos de dependencias (3 moderados y 1 alto). Revisar `npm audit` por separado antes de decidir actualizaciones; no se ejecutó una actualización masiva ajena al alcance.

## Cómo repetir

1. Configurar `FRONTEND_URL` en backend/.env y reiniciar el backend.
2. En backend: `npm ci` y `npm test`.
3. En frontend: `npm ci` y `npm run build`.
4. Desde la raíz: `node backend/scripts/auditar-seguridad.mjs`.
5. Completar las verificaciones reales pendientes anteriores y adjuntar resultados sin credenciales.

Referencias: [Helmet](https://github.com/helmetjs/helmet) y [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
