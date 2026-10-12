-- MIGRACIÓN: Permisos por grupo HU-11
-- Requiere: hu2_grupos_roles.sql y hu4_contactos_oportunidades.sql.
-- Descripción: contactos y oportunidades pasan a pertenecer a un grupo, para que Agentes y Jefes de
-- Área solo vean los de sus grupos (docs/HU11-matriz-permisos.md). Las interacciones heredan el
-- grupo de su contacto. Los registros existentes se asignan al grupo "Administración" de su empresa.

BEGIN;

-- 1. Permite llaves foráneas compuestas (grupo, empresa): un registro no puede apuntar a un grupo de
-- otra empresa.
ALTER TABLE public.groups
  ADD CONSTRAINT groups_id_company_id_key UNIQUE (id, company_id);

-- 2. Columna de grupo
ALTER TABLE public.contactos ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS group_id UUID;

-- 3. Datos existentes: al grupo "Administración" de su empresa (o al más antiguo si ya no existe)
UPDATE public.contactos c
SET group_id = (
  SELECT g.id FROM public.groups g
  WHERE g.company_id = c.company_id
  ORDER BY (g.name = 'Administración') DESC, g.created_at
  LIMIT 1
)
WHERE c.group_id IS NULL;

-- Una oportunidad con contacto toma el grupo del contacto; sin contacto, el de "Administración"
UPDATE public.oportunidades o
SET group_id = COALESCE(
  (SELECT c.group_id FROM public.contactos c WHERE c.id = o.contacto_id),
  (SELECT g.id FROM public.groups g
   WHERE g.company_id = o.company_id
   ORDER BY (g.name = 'Administración') DESC, g.created_at
   LIMIT 1)
)
WHERE o.group_id IS NULL;

-- 4. Llaves foráneas: no se puede borrar un grupo que todavía tiene contactos u oportunidades
ALTER TABLE public.contactos
  ADD CONSTRAINT contactos_group_fk FOREIGN KEY (group_id, company_id)
  REFERENCES public.groups (id, company_id);

ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_group_fk FOREIGN KEY (group_id, company_id)
  REFERENCES public.groups (id, company_id);

-- 5. Índices para filtrar por grupo
CREATE INDEX IF NOT EXISTS idx_contactos_group ON public.contactos (company_id, group_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_group ON public.oportunidades (company_id, group_id);

COMMIT;
