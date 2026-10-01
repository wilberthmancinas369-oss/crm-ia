-- MIGRACIÓN: Contactos, oportunidades e interacciones HU-4
-- Requiere: hu2_grupos_roles.sql (tabla companies y función get_my_company_id).
-- Descripción: tablas del CRM separadas por empresa (company_id). Las llaves foráneas compuestas
-- (id, company_id) impiden ligar una oportunidad o interacción a un contacto de otra empresa.

BEGIN;

-- 1. Contactos (clientes de cada empresa)
CREATE TABLE IF NOT EXISTS public.contactos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    apellido TEXT,
    email TEXT,
    telefono TEXT,
    cargo TEXT,
    empresa_cliente TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (id, company_id)
);

-- 2. Oportunidades de venta
CREATE TABLE IF NOT EXISTS public.oportunidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contacto_id UUID,
    nombre_oportunidad TEXT NOT NULL,
    valor_estimado NUMERIC(12, 2),
    etapa TEXT NOT NULL DEFAULT 'Prospecto'
        CHECK (etapa IN ('Prospecto', 'Calificado', 'Propuesta', 'Ganado', 'Perdido')),
    probabilidad INTEGER DEFAULT 10 CHECK (probabilidad BETWEEN 0 AND 100),
    fecha_cierre_prevista DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (id, company_id),
    -- Si se borra el contacto, la oportunidad se conserva sin contacto
    FOREIGN KEY (contacto_id, company_id)
        REFERENCES public.contactos(id, company_id) ON DELETE SET NULL (contacto_id)
);

-- 3. Interacciones (llamadas, correos, reuniones, notas) con un contacto
CREATE TABLE IF NOT EXISTS public.interacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contacto_id UUID NOT NULL,
    oportunidad_id UUID,
    tipo TEXT NOT NULL CHECK (tipo IN ('Llamada', 'Correo', 'Reunión', 'Nota')),
    detalle TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (contacto_id, company_id)
        REFERENCES public.contactos(id, company_id) ON DELETE CASCADE,
    FOREIGN KEY (oportunidad_id, company_id)
        REFERENCES public.oportunidades(id, company_id) ON DELETE SET NULL (oportunidad_id)
);

-- SEGURIDAD A NIVEL DE FILA (RLS)
-- El backend usa la service role key (no le aplica RLS) y filtra por company_id.
-- RLS bloquea el acceso directo con la anon key desde el navegador.

ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interacciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan contactos de su empresa"
ON public.contactos FOR ALL
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Usuarios gestionan oportunidades de su empresa"
ON public.oportunidades FOR ALL
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Usuarios gestionan interacciones de su empresa"
ON public.interacciones FOR ALL
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_contactos_company ON public.contactos(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oportunidades_company ON public.oportunidades(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oportunidades_contacto ON public.oportunidades(contacto_id);
CREATE INDEX IF NOT EXISTS idx_interacciones_contacto ON public.interacciones(contacto_id);
CREATE INDEX IF NOT EXISTS idx_interacciones_oportunidad ON public.interacciones(oportunidad_id);

COMMIT;
