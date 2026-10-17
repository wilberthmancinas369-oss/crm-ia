# Prueba de flujo completo: tareas y recordatorios

Fecha de ejecución: 17 de octubre de 2026.

## Resultado automatizado

Se ejecutaron `npm test` desde `backend/` y `npm run build` desde `frontend/`.
Resultado: **83 pruebas aprobadas, 0 fallidas**, y compilación correcta del frontend.
Vite mantiene un aviso de tamaño del paquete JavaScript superior a 500 kB; no impide
la compilación.

Se agregaron dos pruebas de flujo integrado a `backend/tests/tareas.test.js`: una
con contacto y otra con oportunidad. Cada una ejecuta, en secuencia:

1. Crear la tarea por `POST /api/tareas` y comprobar el estado inicial `Pendiente`.
2. Consultar `GET /api/tareas` y comprobar que aparece para el usuario autenticado.
3. Revisar vencimientos cuando faltan más de 24 horas: no se envía correo.
4. Editar título, estado y fecha por `PUT /api/tareas/:id`.
5. Revisar vencimientos dentro de 24 horas: generar el correo para el responsable,
   con el título actualizado y el enlace a Mis tareas.
6. Repetir la revisión: no se duplica el recordatorio.
7. Reprogramar la tarea y comprobar que permite un nuevo recordatorio.
8. Volver a reprogramar y completar por `PATCH /api/tareas/:id/completar` antes
   del envío: no se genera otro correo.
9. Consultar otra vez y comprobar el estado `Completada` y el título actualizado.

Las rutas Express, la validación de campos, los servicios y la plantilla de correo
son los del proyecto. La autenticación, la base de datos y la respuesta externa de
Brevo están simuladas. Las peticiones HTTP locales sí recorren las rutas reales.
Estas pruebas no demuestran persistencia en Supabase, políticas RLS, entrega de
correo en una bandeja ni interacción con el formulario React.

Las pruebas existentes cubren adicionalmente permisos por empresa y grupo,
datos inválidos, tareas vencidas, fallos de Brevo y reintentos.

## Comprobación del entorno real

Se consultó Supabase en modo lectura, sin obtener filas de usuarios o tareas.
La tabla y las relaciones utilizadas por Mis tareas y recordatorios respondieron
`PGRST205`: `Could not find the table 'public.tareas' in the schema cache`.

En el `.env` local revisado, `RECORDATORIOS_ACTIVOS` no está activo y no se encontró
la configuración completa de Brevo (clave y remitente). No se cambiaron esos valores.
No se ejecutaron migraciones, no se crearon registros reales y no se enviaron correos.

**El flujo integrado automatizado está aprobado. La prueba con Supabase, interfaz
y correo reales sigue pendiente por la configuración del entorno.**

## Recorrido pendiente en el entorno del equipo

Primero confirmar que frontend y backend usan el proyecto Supabase del equipo y
aplicar `tareas_recordatorios.sql` y `tareas_recordatorio_vencimiento.sql`, en ese orden.
Configurar Brevo y habilitar los recordatorios en una sola instancia del backend,
según `tareas-recordatorios.md`. Usar una cuenta de prueba cuyo correo controle el equipo.

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Iniciar sesión y entrar a Mis tareas. | Se carga el formulario y la lista sin error de tabla. |
| 2 | Enviar el formulario sin datos. | Aparecen validaciones y no se crea una tarea. |
| 3 | Crear una tarea ligada a un contacto, con vencimiento dentro de 24 horas. | Aparece una vez, en estado Pendiente, con la fecha local correcta. |
| 4 | Recargar la página. | La tarea permanece en la lista. |
| 5 | Crear otra tarea ligada a una oportunidad. | Aparece con el nombre de la oportunidad. |
| 6 | Editar una tarea mediante la API con el token de esa cuenta. | Se guardan los campos y se reflejan al recargar Mis tareas. |
| 7 | Esperar la siguiente revisión (hasta 15 minutos). | El responsable recibe el correo con título, fecha y enlace correctos; se guarda `recordatorio_enviado_at`. |
| 8 | Esperar otra revisión. | No recibe un segundo correo para la misma fecha y responsable. |
| 9 | Completar una tarea por la API antes de su recordatorio. | Se muestra Completada al recargar y no se envía su recordatorio. |

La edición y finalización se prueban por API porque la vista implementada solo
incluye consulta y alta. No se añadieron botones ni otras funcionalidades para esta prueba.
