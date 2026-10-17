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
actuales. El control de acceso por grupo deberá seguir el contacto o la oportunidad
relacionados cuando se implemente el servicio, como sucede con las interacciones.

## Aplicación

Con las migraciones `hu2_grupos_roles.sql` y `hu4_contactos_oportunidades.sql` ya
aplicadas, ejecutar una sola vez `backend/db/migrations/tareas_recordatorios.sql`
en el SQL Editor de Supabase. Esta entrega solo agrega el archivo de migración;
no lo ejecuta contra la base de datos.

Este alcance solo define el modelo. La API, las pantallas y la programación o envío
de recordatorios quedan para las siguientes mini tareas.
