# HU-13 · Tareas del equipo (Jefe de Área)

El Jefe de Área ve las tareas de todos los miembros de su grupo, las asigna o reasigna, las edita
y las elimina. El Administrador puede hacer lo mismo en toda la empresa. No requiere migraciones.

## Quién puede qué

| Acción | Agente | Jefe de su grupo | Jefe de otro grupo | Administrador |
|---|---|---|---|---|
| Ver tareas del equipo (`GET /api/tareas/equipo`) | 403 | Las de su grupo | Solo las de su grupo | Toda la empresa |
| Asignar / reasignar (`PATCH /api/tareas/:id/asignar`) | 403 | Sí, a miembros del grupo | 404 | Sí |
| Editar (`PUT /api/tareas/:id`) y completar | Solo las suyas (403 en ajenas) | Sí | 404 | Sí |
| Eliminar (`DELETE /api/tareas/:id`) | Solo las suyas (403 en ajenas) | Sí | 404 | Sí |

- El grupo de una tarea es el de su contacto u oportunidad.
- El permiso usado es `asignarResponsable` (Jefe de Área por grupo, ya existente desde HU 4.1).
- Se puede asignar a cualquier miembro del grupo de la tarea o a un Administrador; a alguien de otro grupo → 400.

## Recordatorio de 24 h

Al reasignar (o cambiar la fecha) se borra `recordatorio_enviado_at`. Si la tarea ya vence en menos
de 24 h y los recordatorios están activos (`RECORDATORIOS_ACTIVOS=true` + Brevo), el correo se manda
en ese momento al **nuevo** responsable; si vence después, lo enviará la revisión periódica de 15 min.

## Frontend

Menú "Tareas del equipo" (`/app/tareas/equipo`), visible con `asignarResponsable`. Filtros por grupo,
responsable y estado; por tarea: asignar a otro miembro, editar (título, fecha, estado) y eliminar,
con confirmación en reasignar y eliminar.

## Pruebas

`backend/tests/tareas_equipo.test.js`: casos por rol (Agente, Jefe de su grupo, Jefe de otro grupo,
Administrador) y del recordatorio al nuevo responsable.
