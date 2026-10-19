-- MIGRACIÓN: Cancelar invitaciones HU-9
-- Requiere: hu2_invitaciones.sql.
-- Descripción: agrega el estado 'cancelada' para que un Jefe de Área o el Administrador puedan
-- anular una invitación pendiente (POST /api/invitaciones/:id/cancelar). Se puede correr más de una vez.

BEGIN;

ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_status_check;
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_status_check
  CHECK (status IN ('pendiente', 'aceptada', 'expirada', 'fallida', 'cancelada'));

COMMIT;
