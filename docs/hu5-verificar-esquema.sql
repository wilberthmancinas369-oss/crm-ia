-- HU5: diagnóstico previo a desplegar dependencias de HU11 y HU6.
-- Solo lectura. Ejecutar en el SQL Editor del proyecto que usa el backend.
-- Devuelve metadatos, no nombres, correos ni registros del CRM.
BEGIN TRANSACTION READ ONLY;

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('companies', 'groups', 'profiles', 'contactos', 'oportunidades', 'tareas')
ORDER BY table_name, ordinal_position;

SELECT c.relname AS tabla, k.conname AS restriccion,
       pg_get_constraintdef(k.oid) AS definicion, k.convalidated AS validada
FROM pg_constraint k
JOIN pg_class c ON c.oid = k.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('groups', 'profiles', 'contactos', 'oportunidades', 'tareas')
ORDER BY c.relname, k.conname;

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('contactos', 'oportunidades', 'tareas')
ORDER BY tablename, policyname;

SELECT c.relname AS tabla, c.relrowsecurity AS rls_activo
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('contactos', 'oportunidades', 'tareas');

SELECT to_regprocedure('public.get_my_company_id()') IS NOT NULL
       AS existe_funcion_empresa;

COMMIT;
