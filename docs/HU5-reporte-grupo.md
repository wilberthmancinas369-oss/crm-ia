# HU5 Reporte del Jefe de Área

## Alcance implementado

`GET /api/reportes/jefe?grupo_id=<uuid>` requiere sesión de Supabase y el permiso existente `verReporteGrupo`. Reutiliza el alcance calculado por el backend. El Jefe solo consulta grupos que dirige; el Administrador puede seleccionar un grupo de su propia empresa. Si existe un único grupo posible, el parámetro puede omitirse. Con varios grupos debe indicarse uno.

El reporte devuelve `grupo_id`, `ventas.montoTotal`, `ventas.totalOportunidades` y `ventas.distribucionEtapas`. El monto suma `valor_estimado` de todas las etapas, incluyendo oportunidades ganadas y perdidas; no representa ingresos cobrados. Se consulta por empresa y grupo y se pagina para evitar truncar los totales a la primera respuesta de Supabase.

La pantalla ofrece selector de grupo, tarjetas, gráfica por etapa, estados de carga, vacío, error y reintento. Los datos de una selección anterior se descartan al cambiar de grupo.

## Integración con HU6

Se integra la rama `origin/HU6-tareas-recordatorios` (commit `72b8015`) en `codex/hu5-integracion-hu6`. La rama original HU5 conserva el avance anterior en `64f14a7`; main no se modifica.

El reporte usa `responsable_id`, `estado` y `fecha_limite` de HU6. La tarea hereda el grupo de su contacto o de su oportunidad; se consultan ambos tipos de vínculo sin duplicarlos. Se filtra la empresa de la tarea, el vínculo y el responsable. Los nombres se obtienen de `profiles.full_name`.

Pendientes incluye `Pendiente` y `En progreso`. Vencidas es el subconjunto de pendientes con `fecha_limite` anterior al instante de consulta; la comparación respeta la zona horaria de TIMESTAMPTZ. Las completadas quedan fuera. Se muestran responsables con tareas pendientes; una tabla vacía indica que no hay pendientes en el grupo, no ausencia de integración.

`productividadDisponible: true` acompaña un objeto por `responsable_id` con `{ nombre, pendientes, vencidas }`. Si todavía falta la tabla de tareas, se conserva el reporte de ventas y se devuelve `productividad: null`, `productividadDisponible: false`. Otros errores se reportan como fallos; no se convierten en ceros.

Antes de probar con datos reales, aplicar las migraciones de HU6 indicadas en `docs/tareas-recordatorios.md` si aún no existen en Supabase. Esta integración no ejecuta migraciones ni activa envíos de correo. Para consultar el reporte basta el modelo de tareas; la migración de recordatorios corresponde al envío de correos.

## Verificación

`node --test tests/*.test.js` desde backend incluye pruebas de la ruta real con Supabase simulado: autenticación, roles por grupo, aislamiento de empresa, selección de grupo, montos, paginación, datos vacíos, fechas con zona horaria, integración de tareas por ambos vínculos y fallos de consulta. No modifica Supabase ni envía correos.

`npm run build` desde frontend verifica la compilación. La validación con cuentas y datos del entorno real debe realizarse antes del cierre de la HU.
