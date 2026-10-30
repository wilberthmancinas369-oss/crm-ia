-- Requiere: hu4_contactos_oportunidades.sql.
-- Los contactos existentes conservan su disponibilidad: parten de Activo.
BEGIN;

ALTER TABLE public.contactos
    ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'Activo'
    CONSTRAINT contactos_estado_check CHECK (estado IN ('Activo', 'Inactivo'));

COMMIT;
