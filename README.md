# Migración de Base de Datos - HU-2: Grupos y Roles

Este repositorio contiene la definición del modelo de datos para la gestión de grupos y roles en el CRM multi-tenant.

## Descripción del Modelo
Se ha implementado una arquitectura de aislamiento por empresa utilizando una columna `company_id` en todas las tablas principales y políticas de **Row Level Security (RLS)** de Supabase para asegurar que ninguna empresa pueda acceder a los datos de otra.

### Entidades implementadas:
- `companies`: Tabla maestra de empresas (tenants).
- `profiles`: Extensión de la tabla de autenticación de Supabase.
- `roles`: Roles con niveles de herencia (Agente > Jefe > Admin).
- `groups`: Departamentos o grupos internos de cada empresa.
- `user_group_role`: Tabla asociativa que asigna un rol específico a un usuario dentro de un grupo.


## Instrucciones de Migración

Existen dos formas de aplicar estos cambios en tu instancia de Supabase:

### Opción 1: Mediante el Dashboard de Supabase (Interfaz Web)
Es la forma más rápida si no tienes el CLI configurado:
1. Accede al **SQL Editor** en tu panel de Supabase.
2. Crea un **New Query**.
3. Copia y pega el contenido completo del archivo `migration_hu2_groups_roles.sql`.
4. Haz clic en **Run**.

### Opción 2: Mediante Supabase CLI (Línea de comandos)
Si estás trabajando en un entorno de desarrollo local con el CLI instalado:
```bash
# Ejecutar la migración directamente contra la base de datos remota
supabase db execute -f migration_hu2_groups_roles.sql

## Importante

### 1. Roles por Defecto
El script crea la estructura de la tabla `roles`. Debido a que cada empresa es independiente, los roles deben ser creados dinámicamente al crear una nueva empresa o mediante un script de semilla (seed) que asocie los roles al `company_id` correspondiente.

### 2. Seguridad (RLS)
Todas las tablas tienen activado RLS. Para que un usuario pueda ver o modificar datos, debe existir una entrada en la tabla `profiles` que coincida con su `auth.uid()` y tenga el mismo `company_id` que los registros que intenta consultar.

### 3. Permisos de Administrador
Las políticas de escritura están restringidas a usuarios que tengan un rol con `level = 2` en la tabla `user_group_role`.

## Documentación Adicional
Para más detalles sobre el diseño y el diagrama entidad-relación, consulta el archivo `DESIGN.md`.
