-- MIGRACIÓN: Refinar contactos y oportunidades HU 4.1
-- Requiere: hu4_contactos_oportunidades.sql y hu11_permisos_por_grupo.sql.
-- Descripción:
--   - Oportunidades: etapas del pipeline (Primer contacto → Propuesta → Negociación → Ganada/Perdida),
--     responsable, monto no negativo y contacto obligatorio.
--   - Contactos: redes sociales (el puesto ya existe en la columna `cargo`).
--   - Tabla de colaboradores de una oportunidad.
-- Catálogos en backend/src/config/crm.js.

BEGIN;

-- 1. Contacto obligatorio: si hay oportunidades sin contacto se detiene sin cambiar nada
DO $$
DECLARE v_sin_contacto INTEGER;
BEGIN
  SELECT count(*) INTO v_sin_contacto FROM public.oportunidades WHERE contacto_id IS NULL;
  IF v_sin_contacto > 0 THEN
    RAISE EXCEPTION 'Hay % oportunidad(es) sin contacto. Asígnales un contacto o bórralas antes de correr esta migración: SELECT id, nombre_oportunidad FROM oportunidades WHERE contacto_id IS NULL;', v_sin_contacto;
  END IF;
END $$;

ALTER TABLE public.oportunidades ALTER COLUMN contacto_id SET NOT NULL;

-- Antes: borrar el contacto dejaba la oportunidad sin contacto. Ahora no se puede borrar
-- un contacto que todavía tiene oportunidades.
ALTER TABLE public.oportunidades DROP CONSTRAINT IF EXISTS oportunidades_contacto_id_company_id_fkey;
ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_contacto_fk FOREIGN KEY (contacto_id, company_id)
  REFERENCES public.contactos (id, company_id) ON DELETE RESTRICT;

-- 2. Etapas del pipeline (las anteriores se convierten)
ALTER TABLE public.oportunidades DROP CONSTRAINT IF EXISTS oportunidades_etapa_check;
UPDATE public.oportunidades SET etapa = CASE etapa
  WHEN 'Prospecto' THEN 'Primer contacto'
  WHEN 'Calificado' THEN 'Primer contacto'
  WHEN 'Ganado' THEN 'Ganada'
  WHEN 'Perdido' THEN 'Perdida'
  ELSE etapa
END;
ALTER TABLE public.oportunidades ALTER COLUMN etapa SET DEFAULT 'Primer contacto';
ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_etapa_check
  CHECK (etapa IN ('Primer contacto', 'Propuesta', 'Negociación', 'Ganada', 'Perdida'));

-- 3. Monto (columna valor_estimado) no negativo
ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_valor_check CHECK (valor_estimado IS NULL OR valor_estimado >= 0);

-- 4. Responsable: quien da seguimiento a la oportunidad. Las existentes quedan a cargo del
-- administrador de su empresa.
ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS responsable_id UUID;
ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_responsable_fk FOREIGN KEY (responsable_id)
  REFERENCES public.profiles (id) ON DELETE SET NULL;

UPDATE public.oportunidades o
SET responsable_id = c.admin_id
FROM public.companies c
WHERE c.id = o.company_id
  AND o.responsable_id IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.admin_id);

CREATE INDEX IF NOT EXISTS idx_oportunidades_responsable ON public.oportunidades (responsable_id);

-- 5. Redes sociales del contacto: { "linkedin": "https://...", "sitio_web": "https://..." }
ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS redes_sociales JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 6. Colaboradores: otros usuarios que ayudan en la oportunidad además del responsable
CREATE TABLE IF NOT EXISTS public.oportunidad_colaboradores (
    oportunidad_id UUID NOT NULL,
    user_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    agregado_por UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (oportunidad_id, user_id),
    CONSTRAINT oportunidad_colaboradores_oportunidad_fk FOREIGN KEY (oportunidad_id, company_id)
        REFERENCES public.oportunidades (id, company_id) ON DELETE CASCADE,
    CONSTRAINT oportunidad_colaboradores_user_fk FOREIGN KEY (user_id)
        REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT oportunidad_colaboradores_agregado_por_fk FOREIGN KEY (agregado_por)
        REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_colaboradores_user ON public.oportunidad_colaboradores (user_id);

-- El backend usa la service role key y filtra por empresa; RLS bloquea el acceso directo
-- con la anon key desde el navegador.
ALTER TABLE public.oportunidad_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven colaboradores de su empresa"
ON public.oportunidad_colaboradores FOR ALL
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

COMMIT;
