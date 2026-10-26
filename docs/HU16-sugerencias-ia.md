# HU16: siguiente paso para una oportunidad

## Contrato y permisos

`POST /api/oportunidades/:id/sugerencia-ia` sin cuerpo de contexto. Reutiliza `autenticar` y `autorizar('gestionarCRM')`: Agentes y Jefes acceden a oportunidades de sus grupos; Administradores a las de su empresa. Empresa y alcance proceden del perfil autenticado. Un UUID inválido devuelve 400; sin sesión, 401; sin rol, 403; oportunidad inexistente o ajena, 404. No se consulta al proveedor para oportunidades no autorizadas.

Respuesta 200: `{ "sugerencia": "Un siguiente paso breve en español." }`. No guarda la sugerencia, modifica registros, crea tareas ni envía correos. No incorpora chats ni predicciones.

## Servicio intercambiable

`services/ia/servicio.js` selecciona el adaptador mediante `IA_PROVEEDOR=gemini`. Su interfaz es `generar(contexto) -> { sugerencia }`. Gemini usa REST `generateContent`, clave en cabecera, instrucciones de sistema y salida JSON estructurada. La validación local exige una sola propiedad, texto no vacío y un máximo de 500 caracteres. El idioma y la pertinencia se piden en el prompt y requieren evaluación real; validar JSON no garantiza la calidad semántica.

Configurar únicamente en `backend/.env`:

```env
IA_PROVEEDOR=gemini
GEMINI_API_KEY=
GEMINI_MODEL=
```

Elegir un modelo disponible en la cuenta con soporte de `generateContent` y JSON estructurado. No hay modelo predeterminado ni claves incluidas. Reiniciar backend tras configurar. No usar variables `VITE_` para secretos. No se añadieron dependencias ni migraciones.

## Contexto y privacidad

Se obtiene la oportunidad mediante filtros de empresa y grupo. Se envía únicamente:

- Etapa validada contra el catálogo del CRM y monto estimado (no ingreso cobrado).
- Tipo y días transcurridos de hasta 50 interacciones recientes vinculadas directamente a esa oportunidad. Se comprueba también la empresa y grupo de su contacto.
- Estado y condición de vencimiento de hasta 50 tareas recientes vinculadas directamente a la oportunidad.
- Una aclaración explícita de que es una muestra limitada y no incluye textos libres.

Se excluyen IDs, empresa, usuario, responsable, nombre de oportunidad, nombres de clientes, correos, teléfonos, notas, detalles de interacciones y títulos de tareas. No se transmiten otras oportunidades ni tareas generales del mismo contacto. Esta decisión reduce la especificidad de las recomendaciones pero evita enviar datos personales contenidos en textos libres. No se registran prompts, respuestas ni credenciales en logs. El monto y la actividad comercial resumida sí salen al proveedor cuando se usa la integración real.

## Fallos y límites

- Espera total de Gemini: 35 segundos compartidos entre intentos, pausa y lectura; frontend: 45 segundos. Un solo reintento tras 1 segundo para HTTP 502, 503 o 504. No se reintentan timeouts, cuota, credenciales ni errores de formato.
- 504 `IA_TIEMPO_AGOTADO`: timeout.
- 503 `IA_CUOTA_AGOTADA`: proveedor respondió 429 (cuota agotada o límite temporal); incluye Retry-After. No se infiere si era cuota gratuita o de pago.
- 503 `IA_NO_CONFIGURADA`: falta clave/modelo o proveedor no implementado.
- 503 `IA_PROVEEDOR_NO_DISPONIBLE`: conexión u otro fallo HTTP, sin exponer su cuerpo de error. Fallos temporales persistentes incluyen Retry-After de 30 segundos.
- 503 `IA_ACCESO_RECHAZADO`, `IA_MODELO_NO_DISPONIBLE`, `IA_SOLICITUD_RECHAZADA`: distinguen HTTP 401/403, 404 y 400 del proveedor con mensajes seguros, sin copiar su respuesta.
- 502 `IA_RESPUESTA_INVALIDA`: salida vacía, bloqueada, incompleta o fuera del formato.
- 429 `IA_LIMITE_USUARIO`: máximo 5 solicitudes por usuario y empresa cada 10 minutos, con Retry-After. Los fallos también consumen solicitudes; cada solicitud puede producir hasta dos llamadas al proveedor por el reintento limitado. Las solicitudes rechazadas por autenticación/UUID no llegan al contador.
- 500: error al consultar datos internos, sin detalles sensibles.

El contador es en memoria, con limpieza de entradas vencidas y tope de 10,000 usuarios activos. Es apropiado para el backend de una instancia del proyecto. Se reinicia al reiniciar el servidor; para múltiples instancias o límites persistentes debe sustituirse por un almacén compartido. No constituye un límite global de facturación del proveedor.

## Interfaz

Panel independiente dentro del detalle de oportunidad. Se genera solo con el botón, se deshabilita mientras carga y muestra errores recuperables. La respuesta se renderiza como texto React, no como HTML. Al cerrar/cambiar de oportunidad se cancela la petición del navegador y no se muestra la respuesta anterior. Cancelar el navegador no garantiza cancelar una llamada que ya llegó al proveedor.

## Pruebas y aceptación

Ejecutar desde backend `node --test tests/ia.test.js`, o `npm test` para toda la suite. Las pruebas utilizan Supabase y Gemini simulados: autenticación, roles, aislamiento por empresa/grupo, ausencia de datos personales, contexto limitado a la oportunidad, monto cero, tareas completadas, errores de BD, cuota, límite por usuario, ventana de tiempo, timeout y formato de respuesta.

La clave ya se configuró y las pruebas reales iniciales con datos ficticios encontraron timeouts y HTTP 503 por alta demanda. El 26 de octubre el usuario confirmó que la generación ya funcionó, después de indicar el cambio a Gemini 3.5 Flash. Esta confirmación manual no sustituye la matriz de aceptación: probar con datos ficticios una oportunidad inicial, una en propuesta, una ganada/perdida y otra sin actividad; evaluar español, brevedad, utilidad y ausencia de hechos inventados. Revisar en navegador carga, éxito, error y cambio de oportunidad con sesión real. Las pruebas simuladas no demuestran disponibilidad del proveedor.

Verificación del 26 de octubre de 2026: 21 pruebas de HU16 aprobadas, incluyendo recuperación tras fallo temporal, máximo de dos llamadas, errores sin reintento y vencimiento del plazo durante la pausa. La tolerancia a fallos no garantiza disponibilidad de Gemini.

Verificación del 24 de octubre de 2026: 17 pruebas nuevas de HU16 aprobadas y suite completa de 169 pruebas aprobada (la base actual eliminó dos pruebas de la acción retirada de remover del grupo). Compilación de Vite aprobada; permanece el aviso de bundle mayor de 500 kB. No se realizaron llamadas reales a Gemini ni escrituras a Supabase.

Referencia oficial: https://ai.google.dev/gemini-api/docs/generate-content/structured-output
