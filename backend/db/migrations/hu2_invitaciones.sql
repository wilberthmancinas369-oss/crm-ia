
--Migracioon: HU-2 Tabla de invitaciones
--Descripción: Implementa la tabla de invitaciones para rastrear invitaciones de usuarios pendientes
--              con aislamiento multi-inquilino y expiración.
BEGIN;

CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aceptada', 'expirada', 'fallida')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(email, company_id) 
);

--Nivel de seguridad a nivel de fila para garantizar que los usuarios solo puedan acceder a las invitaciones de su propia empresa.
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;


--Solo los administradores y jefes pueden ver y gestionar las invitaciones de su empresa
CREATE POLICY "Admins can manage invitations in their company" 
ON public.invitations FOR ALL 
USING (company_id = public.get_my_company_id() AND 
       EXISTS (
           SELECT 1 FROM public.user_group_role ugr 
           JOIN public.roles r ON ugr.role_id = r.id 
           WHERE ugr.user_id = auth.uid() AND r.level >= 1
       ));

-- INDEXES

CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email_company ON public.invitations(email, company_id);
CREATE INDEX idx_invitations_status ON public.invitations(status);

COMMIT;
