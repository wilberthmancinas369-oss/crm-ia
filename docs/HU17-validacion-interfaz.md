# HU-17 · Validación de interfaz

Revisión del 16 de noviembre de 2026 en la rama `HU17-Mejora-GUI-CRM`,
partiendo del commit `a4589ec` y con las correcciones de esta revisión.

Se recorrieron 17 rutas en **Chromium 159.0.8154.6** y **Firefox 159.0**,
con anchos de **320, 390 y 1440 px CSS**. Los dos anchos pequeños simulan el
espacio disponible en un celular. La sesión, el perfil y los datos del CRM
fueron simulados; se usaron los componentes y estilos reales del repositorio.

| Área | Pantallas recorridas |
|---|---|
| Públicas | Inicio, inicio de sesión, registro, recuperación, nueva contraseña, aceptación de invitación |
| Ventas | Bienvenida, Contactos, Oportunidades, Pipeline |
| Tareas | Mis tareas, Tareas del equipo |
| Administración | Grupos, Invitar usuario, Usuarios |
| Reportes | Reporte de grupo, Reporte general |

Se comprobó que cargara el encabezado, que no hubiera excepciones de JavaScript
ni desbordamiento horizontal de toda la página, y se ejecutó la regla de
contraste de axe-core. Como referencia se usaron [WCAG 2.2: contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)
y [reflujo a 320 px CSS](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
Las tablas pueden desplazarse dentro de su propio contenedor para conservar las columnas.

En ambos navegadores también se probó el menú móvil, el cambio de etapa del
Pipeline mediante selector y la búsqueda sin coincidencias seguida de Limpiar
en Mis tareas. No se guardaron datos en Supabase ni se enviaron correos.

Después de las correcciones, **102 de 102 combinaciones de ruta, navegador y
ancho** cargaron sin excepciones de JavaScript ni desbordamiento de página.
Axe no reportó fallos en los textos que pudo medir. Quedaron marcados para
revisión manual 359 casos de contraste en Chromium y 357 en Firefox, contando
repeticiones al cambiar de ancho. También pasaron las **16 comprobaciones de
interacción** y la compilación del frontend con `npm run build`.

## Hallazgos y correcciones

- **Grupos:** a 320 px, la página se desbordaba 30 px. El encabezado y sus
  acciones pueden acomodarse en varias líneas; la tabla de miembros queda
  contenida en su propia área de desplazamiento.
- **Grupos:** un aviso de 10 px tenía contraste de 2.60:1 sobre blanco.
  Se aplicaron el texto secundario del CRM y un tamaño de 14 px al aviso
  y a la fecha de vencimiento de invitaciones.
- **Invitar usuario, Usuarios y Tareas del equipo:** el subtítulo tenía
  contraste de 4.26:1 sobre el fondo. Se usó la clase existente `subtitulo`,
  con 5.36:1 sobre ese fondo y un tamaño de 15.2 px con la configuración probada.

## Pendiente de validación conjunta

- **Equipo:** repetir un recorrido con una cuenta de prueba en Firefox y un
  navegador Chromium, y al menos en un teléfono físico. Comprobar menú táctil,
  teclado, selectores nativos y lectura en las vistas más densas.
- **Product Owner:** revisar legibilidad y comodidad de uso, en especial Grupos,
  Usuarios, Pipeline y Tareas del equipo; registrar aceptación u observaciones
  en OpenProject.
- Si se requiere iPhone/Safari, añadir una prueba en WebKit o Safari real.
  La revisión de Firefox y Chromium no cubre otros motores ni todas sus versiones.

El análisis automático evalúa los elementos que puede medir; no certifica
conformidad WCAG ni reemplaza la revisión visual de fondos complejos y estados
interactivos. La prueba de diseño tampoco valida autenticación, correos ni
persistencia con servicios reales.
