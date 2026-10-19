# Endpoint de Reasignación de Responsable (HU-7)

Permite a un Jefe de Área o Administrador cambiar el agente responsable de una oportunidad.

## Ruta
`PATCH /api/oportunidades/:id/reasignar`

## Seguridad
- **Autenticación:** Requiere JWT válido.
- **Permiso:** `asignarResponsable` en el grupo de la oportunidad.

## Petición
**Body (JSON):**
```json
{
  "responsable_id": "uuid-del-nuevo-agente"
}
```

## Respuestas
| Código | Descripción | Motivo |
|---|---|---|
| 200 | Éxito | Oportunidad actualizada correctamente. |
| 400 | Error de Cliente | `responsable_id` inválido, inexistente en el grupo, o es el mismo que el actual. |
| 401 | No Autenticado | Token ausente o inválido. |
| 403 | Prohibido | El usuario no tiene permiso `asignarResponsable` en el grupo de la oportunidad. |
| 404 | No Encontrado | La oportunidad no existe o no pertenece a la empresa/alcance del usuario. |
| 500 | Error Servidor | Error inesperado en el sistema. |

## Ejemplo de flujo
1. **Petición:** `PATCH /api/oportunidades/abc-123/reasignar` con `{"responsable_id": "xyz-789"}`.
2. **Validación:** El sistema verifica que el usuario sea Jefe del grupo de la oportunidad `abc-123` y que el agente `xyz-789` sea miembro de ese mismo grupo.
3. **Resultado:** Se actualiza el `responsable_id` y se devuelve la oportunidad completa.
