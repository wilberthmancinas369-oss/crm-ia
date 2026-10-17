# Modelo de tareas y recordatorios

El modelo se define en `backend/db/migrations/tareas_recordatorios.sql`, siguiendo
las migraciones SQL existentes de Supabase. La tabla `tareas` representa la tarea
que se utilizará como base para los recordatorios.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | Identificador generado automáticamente. |
| `company_id` | UUID | Empresa propietaria, obligatorio. |
| `titulo` | TEXT | Obligatorio; no puede estar vacío ni contener solo espacios. |
| `fecha_limite` | TIMESTAMPTZ | Fecha y hora límite, obligatorias, con zona horaria. |
| `estado` | TEXT | `Pendiente` (valor inicial), `En progreso` o `Completada`. |
| `responsable_id` | UUID | Perfil del usuario responsable, obligatorio y de la misma empresa. |
| `contacto_id` | UUID | Contacto relacionado, de la misma empresa. |
| `oportunidad_id` | UUID | Oportunidad relacionada, de la misma empresa. |
| `created_at` | TIMESTAMPTZ | Fecha de creación automática. |

Cada tarea debe estar ligada a **un contacto o una oportunidad**, nunca a ambos ni
a ninguno. Si se liga a una oportunidad, no es necesario repetir su contacto.
Las llaves foráneas impiden borrar el responsable, contacto u oportunidad mientras
tengan tareas asociadas; primero se deben reasignar o eliminar esas tareas.
Al eliminar la empresa, sus tareas también se eliminan.

La tabla activa RLS y conserva el aislamiento por empresa utilizado en los modelos
actuales. El servicio verifica el alcance por grupo a través del contacto o la
oportunidad relacionados, como sucede con las interacciones.

## Aplicación

Con las migraciones `hu2_grupos_roles.sql` y `hu4_contactos_oportunidades.sql` ya
aplicadas, ejecutar una sola vez `backend/db/migrations/tareas_recordatorios.sql`
en el SQL Editor de Supabase. Esta entrega solo agrega el archivo de migración;
no lo ejecuta contra la base de datos.

## Servicio y endpoints

Se utiliza el mismo backend Express y cliente Supabase del CRM. Todas las rutas
requieren `Authorization: Bearer <token>` y el permiso existente `gestionarCRM`.
La empresa se obtiene de la sesión; solo se aceptan los campos editables del modelo.
El responsable debe pertenecer a esa empresa y el vínculo debe estar dentro de
los grupos permitidos para el usuario (el administrador tiene alcance de empresa).

| Método | Ruta | Acción |
|---|---|---|
| POST | `/api/tareas` | Crear una tarea; responde 201 con la tarea. |
| PUT | `/api/tareas/:id` | Editar los campos enviados; responde 200 con la tarea. |
| PATCH | `/api/tareas/:id/completar` | Cambiar el estado a `Completada`; responde 200 con la tarea. |

Ejemplo de cuerpo para crear:

```json
{
  "titulo": "Llamar al contacto",
  "fecha_limite": "2026-10-20T15:00:00-07:00",
  "responsable_id": "11111111-1111-4111-8111-111111111111",
  "contacto_id": "22222222-2222-4222-8222-222222222222"
}
```

`estado` es opcional al crear y su valor inicial es `Pendiente`. Para ligar la tarea
a una oportunidad, enviar `oportunidad_id` en lugar de `contacto_id`.
Al editar se valida el resultado completo: para cambiar de contacto a oportunidad,
enviar `contacto_id: null` junto con el nuevo `oportunidad_id` (y viceversa).
Completar no requiere cuerpo y solo modifica el estado; repetirlo mantiene la tarea
completada. La edición permite cambiar el estado a cualquiera de los tres valores.

Los datos inválidos responden 400. Sin sesión se responde 401; sin permiso, 403.
Una tarea o vínculo inexistentes, de otra empresa o fuera del alcance responden 404.
Los errores inesperados del servicio responden 500.

No se incluyen endpoints de consulta o eliminación, pantallas ni programación o
envío de recordatorios. Para usar estas rutas, la migración del modelo debe estar aplicada.
