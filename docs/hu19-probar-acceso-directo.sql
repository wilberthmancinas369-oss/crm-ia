-- Prueba posterior a hu19_acceso_datos_solo_backend.sql. No modifica datos.
-- Comprueba los dos roles de cliente. No crea ni inicia sesión en cuentas reales.
BEGIN;
SET LOCAL statement_timeout = '15s';
DO $prueba$
DECLARE tabla text; rol text; n bigint; comprobaciones integer := 0;
BEGIN
  FOREACH rol IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH tabla IN ARRAY ARRAY['companies','profiles','roles','groups','user_group_role',
      'contactos','oportunidades','interacciones','invitations','invitaciones',
      'oportunidad_colaboradores','oportunidad_reasignaciones','tareas'] LOOP
      IF to_regclass(format('public.%I', tabla)) IS NULL THEN CONTINUE; END IF;
      EXECUTE format('SET LOCAL ROLE %I', rol);
      BEGIN
        EXECUTE format('SELECT count(*) FROM public.%I', tabla) INTO n;
        RAISE EXCEPTION 'Acceso directo inesperado: % / %', rol, tabla;
      EXCEPTION WHEN insufficient_privilege THEN
        comprobaciones := comprobaciones + 1;
      END;
      RESET ROLE;
      IF has_table_privilege(rol, format('public.%I',tabla),'INSERT,UPDATE,DELETE,TRUNCATE') THEN
        RAISE EXCEPTION 'Escritura directa abierta: % / %', rol, tabla;
      END IF;
    END LOOP;
  END LOOP;
  -- El backend mantiene su lectura. No se imprimen filas ni conteos de clientes.
  SET LOCAL ROLE service_role;
  FOREACH tabla IN ARRAY ARRAY['companies','profiles','roles','groups','user_group_role',
    'contactos','oportunidades','interacciones','invitations','invitaciones',
    'oportunidad_colaboradores','oportunidad_reasignaciones','tareas'] LOOP
    IF to_regclass(format('public.%I', tabla)) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT count(*) FROM public.%I', tabla) INTO n;
  END LOOP;
  RESET ROLE;
  IF comprobaciones < 24 THEN RAISE EXCEPTION 'Cobertura insuficiente'; END IF;
  RAISE NOTICE 'OK: % rechazos 42501; lectura backend conservada', comprobaciones;
END
$prueba$;
SELECT 'OK: clientes bloqueados, escrituras denegadas y lecturas backend conservadas' AS resultado;
ROLLBACK;
