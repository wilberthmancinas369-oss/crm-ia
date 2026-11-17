# HU19 — Seguridad: alcance de Daniel

## Estado actualizado — 16 de noviembre de 2026

### Verificación adicional con cuentas reales

- En Chrome, con Daniel Ricardo / Galabo empresa, se creó y observó el contacto `HU19-EXCLUSIVO-GALABO-7F92B6`.
- Con Daniel Osvaldo / Galaproductions en otra sesión, la búsqueda exacta terminó con «No se encontraron resultados con los filtros seleccionados». Se esperó a que terminara la carga; no se tomó un error de sesión como prueba de aislamiento.
- El nombre anterior `PRUEBA-HU19 Galabo` se descartó como evidencia: Daniel indicó que también lo había creado manualmente. Nombres iguales no prueban que sea la misma fila.
- Se repitieron `oportunidades.test.js` y `permisos_grupo.test.js`: 52 pruebas aprobadas, 0 fallos. Incluyen consulta por ID de contacto de otra empresa (404) y lectura/edición/eliminación fuera del grupo, con Supabase simulado.
- Auditoría local repetida: no hay `.env` reales versionados actualmente ni secretos backend detectados en frontend/dist. Sigue el aviso de `.env` en el historial; no se ha verificado su revocación.
- Esta prueba real cubre creación/listado/búsqueda de contactos. Sigue pendiente la petición por ID ajeno con JWT real; las pruebas simuladas no la sustituyen.

Aplicada en el proyecto de Wilberth (`dzjlsafagazdxcfpzvfo`) la migración `backend/db/migrations/hu19_acceso_datos_solo_backend.sql`. Antes se probó con ROLLBACK; después se ejecutó con COMMIT y se verificó en una consulta independiente.

La arquitectura existente usa Supabase Auth desde el frontend y el backend con service_role para los datos. La corrección cierra el acceso directo de anon/authenticated a las 13 tablas CRM y restringe las políticas históricas a service_role; no convierte la función recursiva en SECURITY DEFINER ni habilita acceso adicional. La función auxiliar también deja de ser invocable por clientes. Las políticas históricas no se evalúan para clientes y el backend las omite por su rol privilegiado. No se modificaron filas, usuarios, contraseñas, triggers ni funciones de registro/invitación. Las autorizaciones por empresa y grupo siguen siendo responsabilidad del backend. Esta solución NO habilita consultas directas del frontend a tablas de Supabase: si eso se requiere en el futuro, debe diseñarse y probarse un conjunto nuevo de políticas por rol y grupo.

Resultados posteriores:

- Catálogo real: **13 tablas, 0 sin RLS, 0 con privilegios directos públicos, lectura del backend conservada**.
- Prueba SQL de los roles anon/authenticated: **26 lecturas rechazadas con 42501**; comprobación de ausencia de permisos de escritura; lectura de las 13 tablas con service_role. Sin error 42P17. Prueba reproducible: `docs/hu19-probar-acceso-directo.sql`.
- Data API real con clave pública: profiles, user_group_role, contactos, oportunidades y tareas responden HTTP 401 y código 42501; no se devolvieron registros.
- Login real con un correo ficticio inexistente: intentos 1–33 respondieron 400 invalid_credentials; intento 34 respondió **429 over_request_rate_limit**, momento en que se detuvo la prueba. La configuración es 30/5 minutos por IP; no equivale a un contador rígido de 30 fallos por cuenta, porque influye el tiempo transcurrido y la reposición del límite. No se enviaron correos ni se usaron contraseñas reales. Script optativo: `node backend/scripts/probar-seguridad-remota.mjs --login-rate-limit` (puede limitar temporalmente la IP).
- **268 pruebas locales aprobadas**, incluido aislamiento entre empresas con Supabase simulado.
- CRM comprobado tras arrancar el backend local con recordatorios desactivados: cuenta de Daniel y contactos cargaron correctamente.

Pendientes reales: revisar/rotar con el equipo las credenciales históricas de Git; prueba de extremo a extremo del backend con dos sesiones reales de empresas diferentes; revisión de avisos de dependencias. No se ha afirmado que las pruebas simuladas equivalgan a esa prueba con dos sesiones. No se modificaron main ni la rama de Juventino, ni se publicó esta migración en GitHub todavía.

Las secciones siguientes conservan el diagnóstico inicial. Los pendientes de activación RLS, cierre de la ruta recursiva y observación del 429 quedan resueltos por la evidencia anterior.

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

### Verificación real en Supabase (15 de noviembre de 2026)

Proyecto confirmado por Daniel: organización de Wilberth, referencia `dzjlsafagazdxcfpzvfo`.
Se ejecutaron consultas de solo lectura en SQL Editor, sin modificar datos ni políticas:

- 13 tablas públicas, 0 con RLS desactivado. Además de las 12 versionadas existe `invitaciones`, con RLS activo y cero políticas (sin acceso por políticas para roles normales).
- `get_my_company_id()` desplegada sigue siendo SQL STABLE sin SECURITY DEFINER y consulta profiles. Las políticas de contactos, oportunidades y tareas comparan company_id con esa función; no filtran grupo.
- Prueba `BEGIN READ ONLY; SET LOCAL statement_timeout='2s'; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.profiles; ROLLBACK;`: falló con **42P17: infinite recursion detected in policy for relation "user_group_role"**. Se ejecutó ROLLBACK explícito después y terminó correctamente. No se consultaron registros personales ni se afirmó haber probado dos cuentas reales.
- Authentication > Rate Limits muestra **30 peticiones de registro/login por 5 minutos por dirección IP**, equivalentes a 360/h. Se verificó configuración, no se generó una ráfaga real ni se midió respuesta 429.

El punto de activación RLS queda verificado en el despliegue. La corrección de recursión y la prueba funcional de aislamiento siguen pendientes. La lista siguiente conserva el procedimiento de cierre; el inventario y la revisión inicial ya se realizaron.

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
