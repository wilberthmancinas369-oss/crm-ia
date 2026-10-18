# HU5 Reporte del Jefe de Área

## Alcance implementado

`GET /api/reportes/jefe?grupo_id=<uuid>` requiere sesión de Supabase y el permiso existente `verReporteGrupo`. Reutiliza el alcance calculado por el backend. El Jefe solo consulta grupos que dirige; el Administrador puede seleccionar un grupo de su propia empresa. Si existe un único grupo posible, el parámetro puede omitirse. Con varios grupos debe indicarse uno.

El reporte devuelve `grupo_id`, `ventas.montoTotal`, `ventas.totalOportunidades` y `ventas.distribucionEtapas`. El monto suma `valor_estimado` de todas las etapas, incluyendo oportunidades ganadas y perdidas; no representa ingresos cobrados. Se consulta por empresa y grupo y se pagina para evitar truncar los totales a la primera respuesta de Supabase.

La pantalla ofrece selector de grupo, tarjetas, gráfica por etapa, estados de carga, vacío, error y reintento. Los datos de una selección anterior se descartan al cambiar de grupo.

## Integración pendiente con HU6

Este repositorio todavía no define el modelo de tareas. La respuesta contiene `productividad: null` y `productividadDisponible: false`; la pantalla indica que esa información no está disponible. No se consulta una tabla supuesta ni se muestran ceros como si fueran datos reales.

Antes de completar esta sección, acordar con HU6 los campos de empresa, grupo, responsable, estado y fecha límite; los estados que cuentan como pendientes; y la zona horaria y regla de vencimiento. Después agregar las consultas, nombres de agentes, tabla y pruebas de pendientes y vencidas. La HU5 completa sigue pendiente de esa integración.

## Verificación

`node --test tests/*.test.js` desde backend incluye pruebas de la ruta real con Supabase simulado: autenticación, roles por grupo, aislamiento de empresa, selección de grupo, montos, paginación, datos vacíos y fallos de consulta. No modifica Supabase ni envía correos.

`npm run build` desde frontend verifica la compilación. La validación con cuentas y datos del entorno real debe realizarse antes del cierre de la HU.
