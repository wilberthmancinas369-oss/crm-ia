# Sprint 2 — integración

Todas las historias del Sprint 2 unidas en la rama `HU4.1-reafinar-contactos-oportunidades`.

| HU | Qué hace | Autor | Pantalla |
|---|---|---|---|
| HU 4.1 | Contactos y oportunidades refinados, colaboradores, pipeline | Wilberth | Contactos, Oportunidades, Pipeline |
| HU-5 | Reporte del Jefe de Área: oportunidades, montos y tareas por agente del grupo | Daniel | Reporte de grupo |
| HU-6 | Tareas ligadas a un contacto u oportunidad y recordatorio por correo 24 h antes | Jesús | Mis tareas |
| HU-7 | Reasignar una oportunidad a otro agente con historial | Mia | Oportunidades → detalle |
| HU-8 | Reporte general: comparativa de todos los grupos de la empresa | Juventino | Reporte general |
| HU-9 | Cambiar rol, mover de grupo, sacar del grupo, eliminar de la empresa; reenviar y cancelar invitaciones | Artemio | Usuarios, Grupos |
| HU-11 | El Jefe de Área solo tiene permisos dentro de su grupo (ya estaba en `main`) | Wilberth | — |

Permisos de cada acción: [`HU11-matriz-permisos.md`](HU11-matriz-permisos.md).

## Migraciones (SQL Editor de Supabase, en este orden)

Si el proyecto de Supabase ya tenía el Sprint 1, solo faltan las marcadas como **nuevas**.
No volver a correr `hu11_permisos_por_grupo.sql` si ya se aplicó (falla al crear una regla que ya existe).
Las cuatro nuevas se pueden correr otra vez sin error.

| # | Archivo (`backend/db/migrations/`) | Sprint |
|---|---|---|
| 1 | `hu2_grupos_roles.sql` | 1 |
| 2 | `hu1_registro_empresa.sql` | 1 |
| 3 | `hu2_invitaciones.sql` | 1 |
| 4 | `hu3_aceptar_invitacion.sql` | 1 |
| 5 | `hu4_contactos_oportunidades.sql` | 1 |
| 6 | `hu11_permisos_por_grupo.sql` | 2 |
| 7 | `hu4_1_refinar_contactos_oportunidades.sql` | 2 |
| 8 | `tareas_recordatorios.sql` — **nueva** (HU-6) | 2 |
| 9 | `tareas_recordatorio_vencimiento.sql` — **nueva** (HU-6) | 2 |
| 10 | `hu7_historial_reasignaciones.sql` — **nueva** (HU-7) | 2 |
| 11 | `hu9_invitaciones_canceladas.sql` — **nueva** (HU-9) | 2 |

Para saber cuáles ya están aplicadas, correr en el SQL Editor:

```sql
SELECT 'hu11'  AS migracion, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'oportunidades' AND column_name = 'group_id') AS aplicada
UNION ALL SELECT 'hu4_1', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'oportunidad_colaboradores')
UNION ALL SELECT 'tareas', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tareas')
UNION ALL SELECT 'tareas_vencimiento', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tareas' AND column_name = 'recordatorio_enviado_at')
UNION ALL SELECT 'hu7', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'oportunidad_reasignaciones')
UNION ALL SELECT 'hu9', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_status_check' AND pg_get_constraintdef(oid) LIKE '%cancelada%');
```

## Variables de entorno nuevas (`backend/.env`)

Ver `backend/.env.example`. Los recordatorios de HU-6 están apagados por defecto:

```
RECORDATORIOS_ACTIVOS=true          # solo en UNA instancia del backend
RECORDATORIOS_ZONA_HORARIA=America/Tijuana
BREVO_API_KEY=...                   # ya se usaba para las invitaciones
BREVO_SENDER_EMAIL=...
```

Los archivos `.env` ya no están en el repositorio (`.gitignore`). Cada quien conserva el suyo;
quien no lo tenga lo crea copiando `.env.example`.

## Ajustes hechos al integrar

- **HU-8 + HU-5:** las dos ramas creaban `reportes.service.js`/`reportes.controller.js`. Se conservó
  el reporte de grupo de HU-5 y se agregó el reporte general de HU-8 junto a él. El reporte general
  toma la empresa de la sesión (antes la recibía en `?empresa_id=`) y suma totales de la empresa y
  oportunidades ganadas.
- **HU-9:** venía de una versión de `main` anterior a HU-11 (usaba un solo rol por usuario). Se
  reescribieron los permisos con `config/permisos.js` (rol por grupo), conservando los mismos
  endpoints y la pantalla:
  - Jefe de Área: solo Agentes de sus grupos y solo hacia Agente; para mover, debe dirigir ambos grupos.
  - Nadie se modifica a sí mismo; la empresa nunca se queda sin Administrador.
  - Sacar a alguien de su **único** grupo responde 409 (antes se creaba un grupo "Sin Grupo"):
    se le mueve a otro grupo o se le elimina de la empresa.
  - Eliminar de la empresa pasa sus tareas a quien elimina y deja sus oportunidades sin
    responsable, para reasignarlas con HU-7.
  - Cancelar invitaciones necesitaba el estado `cancelada` → `hu9_invitaciones_canceladas.sql`.
- **HU-7:** `PUT /api/oportunidades/:id` con otro `responsable_id` también pasa por la función de
  reasignación, para que todo cambio de responsable quede en el historial.
- **HU-6:** el responsable de una tarea debe ser del grupo de su contacto u oportunidad (si no, no
  la vería en Mis tareas), y asignarla a otra persona requiere `asignarResponsable`. Mis tareas
  ahora permite cambiar el estado y completar.

## Pruebas

`cd backend && npm test` — 152 pruebas, incluidas las de HU-5, HU-6, HU-7 y HU-9.
