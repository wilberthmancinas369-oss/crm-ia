-- Solo lectura. Ejecutar en SQL Editor del proyecto del CRM.
-- RLS activo no demuestra por sí solo que las políticas sean correctas.
SELECT n.nspname AS esquema, c.relname AS tabla, c.relrowsecurity AS rls_activo,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS politicas
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

-- Debe devolver cero filas; incluye tablas nuevas no previstas en migraciones.
SELECT schemaname, tablename FROM pg_tables
WHERE schemaname = 'public' AND NOT rowsecurity;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Revisar vistas y funciones privilegiadas, que pueden eludir RLS.
SELECT c.relname AS vista, c.reloptions FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v';

SELECT p.proname, p.prosecdef AS security_definer, p.proconfig,
       pg_get_functiondef(p.oid) AS definicion
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND (p.prosecdef OR p.proname = 'get_my_company_id');
