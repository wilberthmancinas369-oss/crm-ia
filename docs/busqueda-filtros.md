# Definición de búsqueda y filtros

Primera mini tarea de la historia «Buscar y filtrar contactos, oportunidades y tareas».
Este documento define el comportamiento para las siguientes mini tareas. No agrega
columnas, consultas, endpoints ni controles visuales.

## Reglas comunes

- Los filtros son opcionales y se combinan con **Y**: cada resultado debe cumplir
  todos los filtros activos. Un campo vacío no aplica filtro.
- Los textos se recortan en los extremos y buscan coincidencias parciales sin
  distinguir mayúsculas y minúsculas. No se promete equivalencia entre letras con
  y sin tilde. Los caracteres `%` y `_` se interpretan como texto, no como comodines.
- Sin filtros se conserva el listado y el orden actuales: contactos y oportunidades
  por creación descendente; tareas por fecha límite ascendente.
- Un valor de catálogo desconocido, un UUID inválido o un rango de monto inválido
  debe producir un error 400 al implementar los endpoints; nunca se ignora para
  devolver una lista más amplia.
- Una consulta válida sin coincidencias devuelve 200 y `[]`. La pantalla mostrará
  «No se encontraron resultados con los filtros seleccionados», sin confundirlo
  con un fallo de carga ni eliminar información.
- «Limpiar» quitará búsqueda y filtros y recuperará el alcance predeterminado.

## Contactos

| Filtro | Campo / parámetro previsto | Comportamiento |
|---|---|---|
| Nombre | `nombre`, `apellido` / `nombre` | Buscar cada palabra en nombre o apellido; todas las palabras deben coincidir. Por ejemplo, «Ana López» encuentra a Ana María López. |
| Empresa | `empresa_cliente` / `empresa` | Coincidencia parcial en la empresa donde trabaja el contacto. Un contacto sin empresa no coincide con un texto de empresa. |
| Estado | Campo previsto `estado` / `estado` | `Activo` o `Inactivo`. Sin selección incluye ambos. Indica la vigencia del contacto, no su etapa comercial. |

«Empresa» se refiere a `empresa_cliente`, no a la empresa propietaria del CRM
(`company_id`). No debe permitir cambiar de empresa ni consultar otros tenants.

Para evitar duplicar la clasificación comercial de las oportunidades, se define
el estado del contacto como `Activo` (disponible para seguimiento) o `Inactivo`
(se conserva, pero ya no se le da seguimiento). No se deduce de sus oportunidades
ni cambia sus permisos o impide consultarlo.

El modelo actual no tiene este campo. Al implementarlo, los contactos nuevos y
existentes partirán de `Activo`, conservando el comportamiento actual; solo una
edición explícita los marcará como `Inactivo`. Esta entrega únicamente define
esa regla: no agrega la columna ni modifica datos.

## Oportunidades

| Filtro | Campo / parámetro previsto | Comportamiento |
|---|---|---|
| Búsqueda | `nombre_oportunidad` / `q` | Coincidencia parcial por nombre de oportunidad. |
| Etapa | `etapa` / `etapa` | Una de: `Primer contacto`, `Propuesta`, `Negociación`, `Ganada`, `Perdida`. Sin selección incluye todas. |
| Responsable | `responsable_id` / `responsable_id` | UUID del responsable principal; no de un colaborador. Sin selección incluye todos los responsables dentro del alcance permitido. |
| Monto mínimo | `valor_estimado` / `monto_min` | Límite inferior inclusivo. |
| Monto máximo | `valor_estimado` / `monto_max` | Límite superior inclusivo. |

Los montos aceptan números no negativos con hasta dos decimales, sin símbolos
monetarios ni separadores de miles. Se permite usar solo uno de los límites;
si se envían ambos, `monto_min` debe ser menor o igual a `monto_max`. El valor 0 es
un límite válido. Un monto nulo queda incluido sin filtro de monto y excluido
cuando se aplica cualquiera de sus límites. Se utiliza la unidad monetaria ya
empleada por el CRM, sin conversiones.

## Tareas

| Filtro | Campo / parámetro previsto | Comportamiento |
|---|---|---|
| Búsqueda | `titulo` / `q` | Coincidencia parcial por título. |
| Estado | `estado` / `estado` | `Pendiente`, `En progreso` o `Completada`. Sin selección incluye los tres. |
| Vencimiento | `fecha_limite` / `vencimiento` | `vencidas`, `proximas_24h` o `sin_vencer`, según las reglas siguientes. |
| Responsable | `responsable_id` / `responsable_id` | UUID de un responsable dentro del alcance autorizado. Se permite consultar a otros responsables; el valor especial `todos` incluye todos los responsables de los registros visibles. Sin parámetro se muestran las tareas del usuario actual. |

El vencimiento se calcula respecto a un único instante actual del backend:

- `vencidas`: fecha límite menor o igual al instante actual.
- `proximas_24h`: fecha límite posterior al instante actual y menor o igual a
  24 horas después, igual que la ventana del recordatorio.
- `sin_vencer`: fecha límite posterior al instante actual, incluidas las próximas 24 horas.

Los tres filtros de vencimiento excluyen tareas completadas. Combinarlos con
`estado=Completada` devuelve una lista vacía; sin vencimiento se pueden consultar
las completadas normalmente. Las comparaciones usan instantes UTC y la interfaz
sigue mostrando las fechas en la hora local, como actualmente.

La vista conservará como selección inicial al usuario actual. El filtro permitirá
seleccionar otro responsable o «Todos los responsables», siempre dentro de la
empresa y los grupos autorizados. «Limpiar» volverá al usuario actual y quitará
los filtros de texto, estado y vencimiento. `todos` es el único valor especial
admitido además de un UUID; no elimina las restricciones por empresa y grupo.
La segunda mini tarea deberá adaptar la consulta, que actualmente fija el
responsable al usuario autenticado. No se cambian los permisos de creación,
asignación, edición o finalización.

## Aislamiento y presentación

- Siempre se conserva `company_id` obtenido de la sesión y el alcance de grupos
  del backend. Los parámetros no sustituyen esas restricciones.
- Contactos y oportunidades conservan su `group_id`. Las tareas heredan el grupo
  del contacto o la oportunidad vinculados.
- Agentes y Jefes consultan sus grupos autorizados; el Administrador conserva su
  alcance de empresa. Elegir un responsable nunca concede acceso a otros grupos.
- Las opciones de empresa y responsable solo deben incluir datos que la cuenta
  esté autorizada a consultar. Un UUID válido fuera de alcance no debe revelar
  datos ni la existencia de esa cuenta: el resultado será vacío.
- En la tercera mini tarea se reutilizarán los campos, selectores, botones y
  variables de color existentes (`frontend/src/styles/variables.css`), sin nuevas
  librerías ni cambios en la estética general. Esta mini tarea no altera la interfaz.
