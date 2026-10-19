-- MIGRACIÓN: Modelo de tareas y recordatorios
-- Requiere: hu2_grupos_roles.sql y hu4_contactos_oportunidades.sql.
-- Una tarea pertenece a una empresa y se liga a un contacto o a una oportunidad.

BEGIN;

-- Permite validar que el responsable pertenezca a la misma empresa que la tarea.
-- (Dentro de DO para poder correr el script otra vez sin error.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_company_id_key') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_company_id_key UNIQUE (id, company_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL CHECK (length(trim(titulo)) > 0),
    fecha_limite TIMESTAMPTZ NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Pendiente'
        CHECK (estado IN ('Pendiente', 'En progreso', 'Completada')),
    responsable_id UUID NOT NULL,
    contacto_id UUID,
    oportunidad_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Se debe indicar exactamente un vínculo.
    CONSTRAINT tareas_vinculo_check CHECK (
        (contacto_id IS NOT NULL AND oportunidad_id IS NULL)
        OR (contacto_id IS NULL AND oportunidad_id IS NOT NULL)
    ),
    FOREIGN KEY (responsable_id, company_id)
        REFERENCES public.profiles(id, company_id),
    FOREIGN KEY (contacto_id, company_id)
        REFERENCES public.contactos(id, company_id),
    FOREIGN KEY (oportunidad_id, company_id)
        REFERENCES public.oportunidades(id, company_id)
);

-- Mismo aislamiento por empresa que los modelos actuales del CRM.
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gestionan tareas de su empresa" ON public.tareas;
CREATE POLICY "Usuarios gestionan tareas de su empresa"
ON public.tareas FOR ALL
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

CREATE INDEX IF NOT EXISTS idx_tareas_company ON public.tareas(company_id, fecha_limite);
CREATE INDEX IF NOT EXISTS idx_tareas_responsable ON public.tareas(responsable_id);
CREATE INDEX IF NOT EXISTS idx_tareas_contacto ON public.tareas(contacto_id);
CREATE INDEX IF NOT EXISTS idx_tareas_oportunidad ON public.tareas(oportunidad_id);

COMMIT;
