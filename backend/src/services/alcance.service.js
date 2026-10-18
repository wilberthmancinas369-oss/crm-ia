import supabase from '../config/supabase.js';
import { NIVELES } from '../config/permisos.js';

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

/**
 * Usuarios que pueden ser responsables o colaboradores de un registro del grupo:
 * los miembros del grupo y los administradores de la empresa. [{ id, nombre, email }]
 */
export async function listarAsignables(grupoId, companyId, userId = null) {
  let consulta = supabase
    .from('user_group_role')
    .select('user_id, group_id, profiles(id, full_name, email), roles(level)')
    .eq('company_id', companyId);
  if (userId) consulta = consulta.eq('user_id', userId);

  const { data, error } = await consulta;
  if (error) throw error;

  const usuarios = new Map();
  for (const a of data) {
    if (a.group_id === grupoId || a.roles.level >= NIVELES.ADMINISTRADOR) {
      usuarios.set(a.user_id, { id: a.user_id, nombre: a.profiles?.full_name ?? null, email: a.profiles?.email ?? null });
    }
  }
  return [...usuarios.values()].sort((x, y) => (x.nombre || '').localeCompare(y.nombre || ''));
}

export const esAsignableEnGrupo = async (userId, grupoId, companyId) =>
  (await listarAsignables(grupoId, companyId, userId)).length > 0;
