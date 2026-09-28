-- MIGRACIÓN: Registro de empresa HU-1
-- Requiere: hu2_grupos_roles.sql (tablas companies, profiles, roles, groups, user_group_role).
-- Descripción: al registrarse un administrador con supabase.auth.signUp() (metadata
-- nombre_empresa y nombre_admin), un trigger crea en una sola transacción la empresa,
-- su perfil, los 3 roles, el grupo "Administración" y le asigna el rol Administrador.

BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.registrar_empresa_nuevo_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid; v_rol_admin uuid; v_grupo uuid;
BEGIN
  -- Solo el registro de empresa manda nombre_empresa; los invitados (HU-3) no pasan por aquí
  IF NEW.raw_user_meta_data->>'nombre_empresa' IS NULL THEN RETURN NEW; END IF;

  INSERT INTO companies (name, admin_id)
    VALUES (trim(NEW.raw_user_meta_data->>'nombre_empresa'), NEW.id) RETURNING id INTO v_company;
  INSERT INTO profiles (id, company_id, full_name, email)
    VALUES (NEW.id, v_company, NEW.raw_user_meta_data->>'nombre_admin', NEW.email);
  INSERT INTO roles (company_id, name, level)
    VALUES (v_company, 'Agente', 0), (v_company, 'Jefe de Área', 1);
  INSERT INTO roles (company_id, name, level)
    VALUES (v_company, 'Administrador', 2) RETURNING id INTO v_rol_admin;
  INSERT INTO groups (company_id, name, description)
    VALUES (v_company, 'Administración', 'Grupo creado al registrar la empresa') RETURNING id INTO v_grupo;
  INSERT INTO user_group_role (user_id, group_id, role_id, company_id)
    VALUES (NEW.id, v_grupo, v_rol_admin, v_company);
  RETURN NEW;
END $$;

CREATE TRIGGER al_registrar_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.registrar_empresa_nuevo_admin();

COMMIT;
