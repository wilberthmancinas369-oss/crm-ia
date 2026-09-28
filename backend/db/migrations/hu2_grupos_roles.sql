-- MIGRACIÓN: Modelo de Grupos y Roles HU-2
-- Descripción: Implementa la estructura multi-tenant para empresas, perfiles, 
-- roles, grupos y la relación entre ellos.

BEGIN;

-- 1. Tabla de Empresas
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Perfiles (Extiende la autenticación de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Roles
-- Uso de 'level' para herencia: 0: Agente, 1: Jefe, 2: Admin
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, name)
);

-- 4. Tabla de Grupos
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, name)
);

-- 5. Asociación Usuario-Grupo-Rol
CREATE TABLE IF NOT EXISTS public.user_group_role (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, group_id)
);

-- SEGURIDAD A NIVEL DE FILA (RLS)

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_role ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para obtener el company_id del usuario desde su perfil
CREATE OR REPLACE FUNCTION public.get_my_company_id() 
RETURNS UUID AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Políticas para 'companies'
-- Solo los propietarios o miembros pueden ver su empresa (simplificado para este MVP)
CREATE POLICY "Usuarios pueden ver su propia empresa" 
ON public.companies FOR SELECT 
USING (id = public.get_my_company_id());

-- Políticas para 'profiles'
CREATE POLICY "Usuarios pueden ver perfiles de su empresa" 
ON public.profiles FOR SELECT 
USING (company_id = public.get_my_company_id());

CREATE POLICY "Admin puede gestionar perfiles de su empresa" 
ON public.profiles FOR ALL 
USING (company_id = public.get_my_company_id() AND 
       EXISTS (
           SELECT 1 FROM public.user_group_role ugr 
           JOIN public.roles r ON ugr.role_id = r.id 
           WHERE ugr.user_id = auth.uid() AND r.level = 2
       ));

-- Políticas para 'roles'
CREATE POLICY "Usuarios pueden ver roles de su empresa" 
ON public.roles FOR SELECT 
USING (company_id = public.get_my_company_id());

CREATE POLICY "Admin puede gestionar roles de su empresa" 
ON public.roles FOR ALL 
USING (company_id = public.get_my_company_id() AND 
       EXISTS (
           SELECT 1 FROM public.user_group_role ugr 
           JOIN public.roles r ON ugr.role_id = r.id 
           WHERE ugr.user_id = auth.uid() AND r.level = 2
       ));

-- Políticas para 'groups'
CREATE POLICY "Usuarios pueden ver grupos de su empresa" 
ON public.groups FOR SELECT 
USING (company_id = public.get_my_company_id());

CREATE POLICY "Admin puede gestionar grupos de su empresa" 
ON public.groups FOR ALL 
USING (company_id = public.get_my_company_id() AND 
       EXISTS (
           SELECT 1 FROM public.user_group_role ugr 
           JOIN public.roles r ON ugr.role_id = r.id 
           WHERE ugr.user_id = auth.uid() AND r.level = 2
       ));

-- Políticas para 'user_group_role'
CREATE POLICY "Usuarios pueden ver membresías de su empresa" 
ON public.user_group_role FOR SELECT 
USING (company_id = public.get_my_company_id());

CREATE POLICY "Admin puede gestionar membresías de su empresa" 
ON public.user_group_role FOR ALL 
USING (company_id = public.get_my_company_id() AND 
       EXISTS (
           SELECT 1 FROM public.user_group_role ugr 
           JOIN public.roles r ON ugr.role_id = r.id 
           WHERE ugr.user_id = auth.uid() AND r.level = 2
       ));

-- ÍNDICES

-- Búsqueda rápida de perfiles por empresa
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);

-- Búsqueda rápida de grupos por empresa
CREATE INDEX idx_groups_company_id ON public.groups(company_id);

-- Búsqueda rápida de roles por empresa
CREATE INDEX idx_roles_company_id ON public.roles(company_id);

-- Búsqueda rápida de membresías por usuario y empresa
CREATE INDEX idx_ugr_user_company ON public.user_group_role(user_id, company_id);

-- Búsqueda rápida de membresías por grupo y empresa
CREATE INDEX idx_ugr_group_company ON public.user_group_role(group_id, company_id);

-- DATOS INICIALES (SEMILLA DE ROLES)
-- Nota: Esta es una semilla conceptual. En una migración real, se necesitaría el company_id.
-- Manejaremos los roles semilla a través de la API o un script de configuración por empresa.

COMMIT;
