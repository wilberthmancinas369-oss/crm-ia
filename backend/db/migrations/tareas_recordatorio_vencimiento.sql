-- Requiere: tareas_recordatorios.sql.
BEGIN;

ALTER TABLE public.tareas
    ADD COLUMN IF NOT EXISTS recordatorio_enviado_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tareas_recordatorio_pendiente
    ON public.tareas(fecha_limite)
    WHERE recordatorio_enviado_at IS NULL AND estado <> 'Completada';

COMMIT;
