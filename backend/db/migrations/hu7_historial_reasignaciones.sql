-- SCRIPT: Historial de Reasignaciones de Oportunidades (HU-7) - Versión Final Correcta
-- Descripción: Crea la tabla de historial y la función RPC para realizar reasignaciones atómicas.
-- Requiere: hu4_1_refinar_contactos_oportunidades.sql (columna oportunidades.responsable_id).

BEGIN;

-- 1. Tabla de historial de reasignaciones
CREATE TABLE IF NOT EXISTS public.oportunidad_reasignaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    oportunidad_id UUID NOT NULL,
    responsable_anterior_id UUID,
    responsable_nuevo_id UUID,
    reasignado_por UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- FKs y restricciones
    -- Se usa la constraint UNIQUE (id, company_id) verificada en la tabla oportunidades
    CONSTRAINT reasignaciones_oportunidad_fk FOREIGN KEY (oportunidad_id, company_id) 
        REFERENCES public.oportunidades (id, company_id) ON DELETE CASCADE,
    CONSTRAINT reasignaciones_anterior_fk FOREIGN KEY (responsable_anterior_id) 
        REFERENCES public.profiles (id) ON DELETE SET NULL,
    CONSTRAINT reasignaciones_nuevo_fk FOREIGN KEY (responsable_nuevo_id) 
        REFERENCES public.profiles (id) ON DELETE SET NULL,
    CONSTRAINT reasignaciones_usuario_fk FOREIGN KEY (reasignado_por) 
        REFERENCES public.profiles (id) ON DELETE SET NULL
);

-- Índices para optimizar consultas de historial
CREATE INDEX IF NOT EXISTS idx_reasignaciones_oportunidad ON public.oportunidad_reasignaciones (oportunidad_id);
CREATE INDEX IF NOT EXISTS idx_reasignaciones_company ON public.oportunidad_reasignaciones (company_id);

-- 2. Función RPC para reasignación atómica
CREATE OR REPLACE FUNCTION public.reasignar_oportunidad(
    p_oportunidad_id UUID, 
    p_company_id UUID, 
    p_nuevo_responsable_id UUID, 
    p_reasignado_por UUID
) 
RETURNS TABLE (responsable_anterior UUID, responsable_nuevo UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_responsable_actual UUID;
BEGIN
    -- Bloqueo de fila para evitar condiciones de carrera
    SELECT responsable_id INTO v_responsable_actual
    FROM public.oportunidades
    WHERE id = p_oportunidad_id AND company_id = p_company_id
    FOR UPDATE;

    -- Validación 1: La oportunidad debe existir en esa empresa
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La oportunidad no existe o no pertenece a la empresa indicada' 
        USING ERRCODE = 'HU701';
    END IF;

    -- Validación 2: El nuevo responsable no puede ser el mismo que el actual
    -- Usamos IS NOT DISTINCT FROM para manejar correctamente los valores NULL
    IF v_responsable_actual IS NOT DISTINCT FROM p_nuevo_responsable_id THEN
        RAISE EXCEPTION 'El agente destino ya es el responsable actual de la oportunidad' 
        USING ERRCODE = 'HU702';
    END IF;

    -- Operación 1: Actualizar responsable de la oportunidad
    UPDATE public.oportunidades 
    SET responsable_id = p_nuevo_responsable_id 
    WHERE id = p_oportunidad_id AND company_id = p_company_id;

    -- Operación 2: Registrar el cambio en el historial
    INSERT INTO public.oportunidad_reasignaciones (
        company_id, 
        oportunidad_id, 
        responsable_anterior_id, 
        responsable_nuevo_id, 
        reasignado_por
    ) VALUES (
        p_company_id, 
        p_oportunidad_id, 
        v_responsable_actual, 
        p_nuevo_responsable_id, 
        p_reasignado_por
    );

    -- Devolver los valores para el servicio del backend
    RETURN QUERY SELECT v_responsable_actual, p_nuevo_responsable_id;
END;
$$;

-- Gestión de permisos de la función (Solo el backend via service_role puede ejecutarla)
REVOKE ALL ON FUNCTION public.reasignar_oportunidad(UUID, UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reasignar_oportunidad(UUID, UUID, UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.reasignar_oportunidad(UUID, UUID, UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reasignar_oportunidad(UUID, UUID, UUID, UUID) TO service_role;

-- 3. RLS (Row Level Security)
ALTER TABLE public.oportunidad_reasignaciones ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven el historial de su propia empresa
DROP POLICY IF EXISTS "Usuarios ven historial de su empresa" ON public.oportunidad_reasignaciones;
CREATE POLICY "Usuarios ven historial de su empresa" 
ON public.oportunidad_reasignaciones 
FOR SELECT 
USING (company_id = public.get_my_company_id());

COMMIT;

-- =============================================================================
-- BLOQUE DE VERIFICACIÓN (Ejecutar para comprobar la creación)
-- =============================================================================
-- Comprobar tabla
SELECT 'Tabla' as objeto, count(*) FROM information_schema.tables WHERE table_name = 'oportunidad_reasignaciones';
-- Comprobar índices
SELECT 'Indice Oportunidad' as objeto, count(*) FROM pg_indexes WHERE indexname = 'idx_reasignaciones_oportunidad';
SELECT 'Indice Company' as objeto, count(*) FROM pg_indexes WHERE indexname = 'idx_reasignaciones_company';
-- Comprobar Función
SELECT 'Funcion' as objeto, count(*) FROM pg_proc WHERE proname = 'reasignar_oportunidad';
-- Comprobar RLS
SELECT 'RLS' as objeto, relrowsecurity FROM pg_class WHERE relname = 'oportunidad_reasignaciones';

-- =============================================================================
-- BLOQUE DE PRUEBA MANUAL (Sustituir UUIDs por reales)
-- =============================================================================
/*
-- 1. Definir variables de prueba
DO $$ 
DECLARE 
    v_op_id UUID := 'TU_OPORTUNIDAD_ID'; 
    v_comp_id UUID := 'TU_COMPANY_ID'; 
    v_nuevo_resp UUID := 'TU_NUEVO_RESPONSABLE_ID'; 
    v_quien_reasigna UUID := 'TU_USUARIO_ID';
BEGIN
    -- Ejecutar reasignación
    PERFORM public.reasignar_oportunidad(v_op_id, v_comp_id, v_nuevo_resp, v_quien_reasigna);
END $$;

-- 2. Verificar resultado en oportunidad
SELECT responsable_id FROM public.oportunidades WHERE id = 'TU_OPORTUNIDAD_ID';

-- 3. Verificar registro en historial
SELECT * FROM public.oportunidad_reasignaciones WHERE oportunidad_id = 'TU_OPORTUNIDAD_ID';

-- 4. (OPCIONAL) Limpiar prueba: revertir responsable y borrar registro de historial
-- UPDATE public.oportunidades SET responsable_id = 'RESPONSABLE_ANTERIOR' WHERE id = 'TU_OPORTUNIDAD_ID';
-- DELETE FROM public.oportunidad_reasignaciones WHERE oportunidad_id = 'TU_OPORTUNIDAD_ID' AND responsable_nuevo_id = 'TU_NUEVO_RESPONSABLE_ID';
*/
