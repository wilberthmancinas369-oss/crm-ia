-- HU19: el frontend usa Auth; los datos pasan por el backend con service_role.
-- Ejecutar DESPUÉS de las migraciones anteriores. No modifica filas ni auth.
-- Las políticas históricas se conservan, pero dejan de aplicarse a clientes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $seguridad$
DECLARE
  tabla text;
  politica record;
  columna record;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['companies','profiles','roles','groups','user_group_role',
    'contactos','oportunidades','interacciones','invitations','invitaciones',
    'oportunidad_colaboradores','oportunidad_reasignaciones','tareas'] LOOP
    IF to_regclass(format('public.%I', tabla)) IS NULL THEN
      IF tabla = 'invitaciones' THEN CONTINUE; END IF;
      RAISE EXCEPTION 'Falta tabla requerida: %', tabla;
    END IF;
    -- No ampliar privilegios del backend: abortar si no tiene acceso previo.
    IF NOT has_table_privilege('service_role', format('public.%I', tabla), 'SELECT') THEN
      RAISE EXCEPTION 'Revisar permisos previos de service_role: %', tabla;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla);
    FOR politica IN SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=tabla LOOP
      EXECUTE format('ALTER POLICY %I ON public.%I TO service_role', politica.policyname, tabla);
    END LOOP;
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', tabla);
    -- Los permisos de columna se revocan por separado de los de tabla.
    FOR columna IN SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tabla LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated', columna.column_name, tabla);
    END LOOP;
  END LOOP;
END
$seguridad$;
-- Auxiliar no usado por el frontend; impedir invocación directa de la recursión.
REVOKE EXECUTE ON FUNCTION public.get_my_company_id() FROM PUBLIC, anon, authenticated;
COMMIT;
