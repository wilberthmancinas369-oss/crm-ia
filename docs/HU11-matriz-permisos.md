# HU-11 · Matriz de permisos por rol

> Como Administrador, quiero que el Jefe de Área solo tenga permisos dentro de su propio grupo,
> para que no pueda ver ni modificar otros grupos ni usar funciones exclusivas del Administrador.

## Conceptos

- **El rol es por grupo.** Cada fila de `user_group_role` asigna un rol a un usuario *en un grupo*.
  Un usuario puede ser Jefe de Área en *Ventas* y Agente en *Soporte*; en *Soporte* solo actúa como Agente.
- **El Administrador es de empresa.** Quien tiene el rol Administrador (nivel 2) en cualquier grupo
  tiene alcance sobre **toda la empresa**.
- **Alcance de grupo.** Agente y Jefe de Área solo ven y modifican recursos de los grupos donde tienen
  el nivel requerido. Fuera de ellos, el backend responde 403 (acciones) o 404 (lecturas de un recurso
  que no le pertenece), sin revelar si existe.
- **Fuente de verdad:** `backend/src/config/permisos.js`. El backend valida cada petición; el frontend
  solo oculta opciones.

Niveles: **Agente = 0 · Jefe de Área = 1 · Administrador = 2**. Cada rol hereda lo del anterior.

## Matriz

| Permiso (`permisos.js`) | Acción | Agente | Jefe de Área | Administrador |
|---|---|---|---|---|
| `gestionarCRM` | Ver, crear, editar y borrar contactos, oportunidades e interacciones | Su grupo | Su grupo | Toda la empresa |
| `verGrupos` | Listar grupos | Los suyos | Los suyos | Todos |
| `verMiembros` | Ver miembros e invitaciones pendientes | — | Su grupo | Todos |
| `invitarUsuarios` | Invitar usuarios a un grupo | — | Su grupo, solo como **Agente** | Cualquier grupo, como Agente o Jefe de Área |
| `gestionarInvitaciones` | Reenviar y cancelar invitaciones (`POST /api/invitaciones/:id/reenviar` y `/cancelar`) | — | Su grupo | Todos |
| `gestionarMiembros` | Cambiar rol, mover de grupo y sacar miembros (`POST /api/usuarios/cambiar-rol`, `/mover-grupo`, `/remover-grupo`, HU-9) | — | Su grupo, solo a **Agentes**, solo hacia **Agente** | Todos |
| `verReporteGrupo` | Reporte del grupo (`GET /api/reportes/jefe`, HU-5) | — | Su grupo | Todos |
| `asignarResponsable` | Asignar o reasignar el responsable y los colaboradores de cualquier oportunidad (HU 4.1, HU-7) y asignar tareas a otra persona (HU-6) | — (solo las suyas) | Su grupo | Todos |
| `crearGrupos` | Crear grupos | — | — | ✓ |
| `eliminarGrupos` | Eliminar grupos *(endpoint pendiente)* | — | — | ✓ |
| `verReporteGeneral` | Reporte general de la empresa (`GET /api/reportes/general`, HU-8) | — | — | ✓ |
| `administrarUsuarios` | Eliminar usuarios de la empresa (`POST /api/usuarios/eliminar-empresa`, HU-9) | — | — | ✓ |
| — | Registrar la empresa | Público (crea al Administrador) | | |

## Sin escalada de privilegios

- Un Jefe de Área **solo puede asignar el rol Agente** (al invitar o al cambiar un rol).
- Un Jefe de Área **no puede modificar** a otro Jefe de Área ni a un Administrador, ni a sí mismo.
- Nadie puede asignar el rol **Administrador** por invitación.
- El Administrador puede asignar Agente o Jefe de Área en cualquier grupo.

Funciones que lo implementan: `rolMaximoAsignable` y `puedeGestionarMiembro` en `permisos.js`.
Los endpoints de HU-9 (`usuario.controller.js`) las usan en lugar de reimplementar la regla.
Además, la empresa nunca se queda sin Administrador y a nadie se le saca de su único grupo
(se le mueve a otro grupo o se le elimina de la empresa).

## Datos por grupo

- `contactos` y `oportunidades` tienen `group_id` (migración `hu11_permisos_por_grupo.sql`).
  Las interacciones heredan el grupo de su contacto.
- Al crear un registro se indica `grupo_id`; si el usuario pertenece a un solo grupo, se usa ese.
- Una oportunidad ligada a un contacto toma el grupo del contacto.
- Los registros que existían antes de esta HU se asignaron al grupo *Administración* de su empresa.
