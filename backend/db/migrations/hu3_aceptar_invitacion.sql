-- MIGRACIÓN: Aceptar invitación HU-3
-- Requiere: hu2_grupos_roles.sql y hu2_invitaciones.sql.
-- Descripción: función que, en una sola transacción, asocia a un usuario recién creado en
-- Supabase Auth con la empresa, el grupo y el rol de su invitación, y la marca como aceptada.
-- El backend crea primero la cuenta (auth.admin.createUser) y luego llama a esta función.

BEGIN;

-- 1. Permitir volver a invitar un correo cuya invitación anterior expiró, falló o ya se aceptó.
-- La restricción original UNIQUE(email, company_id) lo impedía para siempre; ahora solo puede
-- haber UNA invitación pendiente por correo y empresa.
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_email_company_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pendiente_unica
    ON public.invitations (lower(email), company_id)
    WHERE status = 'pendiente';

-- 2. Asociar al usuario con su empresa, grupo y rol
CREATE OR REPLACE FUNCTION public.aceptar_invitacion(p_token TEXT, p_user_id UUID, p_nombre TEXT)
RETURNS UUID -- company_id de la empresa a la que se unió
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv public.invitations%ROWTYPE;
BEGIN
  -- FOR UPDATE bloquea la fila: si dos personas abren el mismo enlace, solo una la acepta
  SELECT * INTO v_inv FROM invitations WHERE token = p_token FOR UPDATE;

  IF NOT FOUND OR v_inv.status <> 'pendiente' THEN
    RAISE EXCEPTION 'INVITACION_INVALIDA';
  END IF;

  IF v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'INVITACION_EXPIRADA';
  END IF;

  INSERT INTO profiles (id, company_id, full_name, email)
    VALUES (p_user_id, v_inv.company_id, trim(p_nombre), lower(v_inv.email));

  INSERT INTO user_group_role (user_id, group_id, role_id, company_id)
    VALUES (p_user_id, v_inv.group_id, v_inv.role_id, v_inv.company_id);

  UPDATE invitations SET status = 'aceptada' WHERE id = v_inv.id;

  RETURN v_inv.company_id;
END $$;

-- Solo el backend (service role) puede llamarla. Sin esto, cualquiera con la anon key podría
-- llamarla por la API de Supabase y meter un usuario arbitrario a una empresa.
REVOKE EXECUTE ON FUNCTION public.aceptar_invitacion(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aceptar_invitacion(TEXT, UUID, TEXT) TO service_role;

COMMIT;
