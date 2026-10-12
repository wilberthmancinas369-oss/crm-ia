import supabase from '../config/supabase.js';

// Ayudantes para aplicar req.alcance (middleware autorizar) en las consultas del CRM.

// Agrega el filtro por grupo a una consulta de Supabase. alcance null = toda la empresa.
export const filtrarPorGrupos = (consulta, alcance, columna = 'group_id') =>
  alcance === null ? consulta : consulta.in(columna, alcance);

/**
 * Grupo en el que se guarda un registro nuevo (o al que se mueve uno existente).
 * - Si se indica grupoId, debe estar en el alcance; el Administrador puede usar cualquier grupo de su empresa.
 * - Si no se indica y el usuario tiene un solo grupo posible, se usa ese.
 * Devuelve { grupoId } o { status, error }.
 */
export async function resolverGrupoDestino({ alcance, perfil, company_id }, grupoId) {
  if (grupoId) {
    if (alcance !== null) {
      return alcance.includes(grupoId)
        ? { grupoId }
        : { status: 403, error: 'No tienes permisos sobre ese grupo' };
    }
    const { data, error } = await supabase
      .from('groups')
      .select('id')
      .eq('id', grupoId)
      .eq('company_id', company_id)
      .maybeSingle();
    if (error) throw error;
    return data ? { grupoId } : { status: 404, error: 'Grupo no encontrado en tu empresa' };
  }

  const posibles = alcance ?? perfil.grupos.map((g) => g.id);
  if (posibles.length === 1) return { grupoId: posibles[0] };
  return { status: 400, error: 'Indica el grupo (grupo_id): perteneces a más de uno' };
}

// Empresa y grupos permitidos de la petición, en la forma que reciben los servicios del CRM
export const ambitoDe = (req) => ({ companyId: req.company_id, alcance: req.alcance });

// Busca un registro con group_id solo si está en el alcance; null si no existe o no le pertenece
async function buscarVisible(tabla, id, { companyId, alcance }) {
  const { data, error } = await filtrarPorGrupos(
    supabase.from(tabla).select('id, group_id').eq('id', id).eq('company_id', companyId),
    alcance
  ).maybeSingle();
  if (error) throw error;
  return data;
}

export const buscarContactoVisible = (id, ambito) => buscarVisible('contactos', id, ambito);
export const buscarOportunidadVisible = (id, ambito) => buscarVisible('oportunidades', id, ambito);
