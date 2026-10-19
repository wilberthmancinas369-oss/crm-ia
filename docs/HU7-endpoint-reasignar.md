# Historial y Reasignación de Responsables (HU-7)

Permite a un Jefe de Área o Administrador cambiar el agente responsable de una oportunidad y consultar el historial de cambios.

## 1. Endpoint de Reasignación
`PATCH /api/oportunidades/:id/reasignar`

### Seguridad
- **Autenticación:** Requiere JWT válido.
- **Permiso:** `asignarResponsable` en el grupo de la oportunidad.
- **Implementación:** Utiliza una función RPC atómica en Postgres para garantizar que el cambio de responsable y el registro en el historial ocurran en una sola transacción.

### Petición
**Body (JSON):**
```json
{
  "responsable_id": "uuid-del-nuevo-agente"
}
```

### Respuestas
| Código | Descripción | Motivo |
|---|---|---|
| 200 | Éxito | Oportunidad actualizada y registro creado en historial. |
| 400 | Error de Cliente | `responsable_id` inválido, inexistente en el grupo, o es el mismo que el actual (`HU702`). |
| 401 | No Autenticado | Token ausente o inválido. |
| 403 | Prohibido | El usuario no tiene permiso `asignarResponsable` en el grupo de la oportunidad. |
| 404 | No Encontrado | La oportunidad no existe o no pertenece a la empresa/alcance del usuario (`HU701`). |
| 500 | Error Servidor | Error inesperado en el sistema. |

---

## 2. Endpoint de Historial
`GET /api/oportunidades/:id/reasignaciones`

### Seguridad
- **Autenticación:** Requiere JWT válido.
- **Visibilidad:** El usuario debe tener acceso a la oportunidad (basado en su empresa y grupos permitidos).

### Respuestas
**Éxito (200):** Devuelve un arreglo de reasignaciones, de la más reciente a la más antigua.
```json
[
  {
    "id": "uuid",
    "created_at": "2023-10-27T...",
    "responsable_anterior_id": "uuid",
    "responsable_anterior": { "full_name": "Juan Pérez" },
    "responsable_nuevo_id": "uuid",
    "responsable_nuevo": { "full_name": "Ana García" },
    "reasignado_por": "uuid",
    "usuario_reasignó": { "full_name": "Jefe de Área" }
  }
]
```
| Código | Descripción | Motivo |
|---|---|---|
| 200 | Éxito | Historial recuperado correctamente. |
| 404 | No Encontrado | La oportunidad no existe o el usuario no tiene acceso a ella. |
