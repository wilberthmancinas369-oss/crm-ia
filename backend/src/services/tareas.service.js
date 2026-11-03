import supabase from '../config/supabase.js';
import { buscarContactoVisible, buscarOportunidadVisible, filtrarPorGrupos } from './alcance.service.js';
import { patronTexto } from './filtrosListado.js';

// Tareas de la empresa dentro del alcance, ordenadas por fecha límite. Cada consulta hereda el grupo
// de su vínculo; !inner excluye tareas del otro tipo. Con responsableId, solo las de esa persona.
// filtros (HU-12): q (título), estado y vencimiento.
async function listarTareas({ companyId, alcance }, { responsableId, conResponsable = false, filtros = {} } = {}) {
  const extra = conResponsable ? ', profiles!inner(id, full_name, email)' : '';
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
  const consultas = [
    ['contactos', 'id, nombre, apellido, group_id'],
    ['oportunidades', 'id, nombre_oportunidad, group_id']
  ].map(([tabla, campos]) => {
    let consulta = supabase.from('tareas').select(`*, ${tabla}!inner(${campos})${extra}`)
      .eq('company_id', companyId);
    if (responsableId) consulta = consulta.eq('responsable_id', responsableId);
    if (filtros.q) consulta = consulta.ilike('titulo', patronTexto(filtros.q));
    if (filtros.estado) consulta = consulta.eq('estado', filtros.estado);
    if (filtros.vencimiento) {
      consulta = consulta.neq('estado', 'Completada');
      consulta = filtros.vencimiento === 'vencidas'
        ? consulta.lte('fecha_limite', ahora.toISOString())
        : consulta.gt('fecha_limite', ahora.toISOString());
      if (filtros.vencimiento === 'proximas_24h') consulta = consulta.lte('fecha_limite', hasta.toISOString());
    }
    return filtrarPorGrupos(consulta, alcance, `${tabla}.group_id`);
  });
  const resultados = await Promise.all(consultas);
  for (const resultado of resultados) if (resultado.error) throw resultado.error;
  return resultados.flatMap(({ data }) => data)
    .sort((a, b) => new Date(a.fecha_limite) - new Date(b.fecha_limite));
}

export const tareasService = {
  // HU-12: responsable_id filtra por otra persona del alcance; 'todos' quita el filtro.
  getMisTareas(responsableId, ambito, filtros = {}) {
    const responsable = filtros.responsable_id || responsableId;
    return listarTareas(ambito, { responsableId: responsable === 'todos' ? null : responsable, filtros });
  },

  // HU-13: tareas de todos los miembros de los grupos indicados (alcance de asignarResponsable),
  // con el nombre del responsable y el grupo de la tarea.
  async getTareasEquipo(ambito) {
    const tareas = await listarTareas(ambito, { conResponsable: true });
    return tareas.map(({ profiles, ...tarea }) => ({
      ...tarea,
      group_id: (tarea.contactos ?? tarea.oportunidades).group_id,
      responsable: { id: profiles.id, nombre: profiles.full_name ?? null, email: profiles.email ?? null }
    }));
  },

  // La tarea hereda el alcance del contacto o la oportunidad vinculados. Devuelve también el
  // group_id del vínculo (no es columna de tareas) para validar permisos por grupo.
  async getById(id, ambito) {
    const { data, error } = await supabase.from('tareas').select('*')
      .eq('id', id).eq('company_id', ambito.companyId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const vinculo = data.contacto_id
      ? await buscarContactoVisible(data.contacto_id, ambito)
      : await buscarOportunidadVisible(data.oportunidad_id, ambito);
    return vinculo ? { ...data, group_id: vinculo.group_id } : null;
  },

  async create(datos, { companyId }) {
    const { data, error } = await supabase.from('tareas')
      .insert([{ ...datos, company_id: companyId }]).select().single();
    if (error) throw error;
    return data;
  },

  // El controlador verifica el alcance antes de modificar o completar la tarea.
  async update(id, datos, { companyId }) {
    const { data, error } = await supabase.from('tareas').update(datos)
      .eq('id', id).eq('company_id', companyId).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async remove(id, { companyId }) {
    const { data, error } = await supabase.from('tareas').delete()
      .eq('id', id).eq('company_id', companyId).select().maybeSingle();
    if (error) throw error;
    return data;
  },

  async responsableExiste(id, { companyId }) {
    const { data, error } = await supabase.from('profiles').select('id')
      .eq('id', id).eq('company_id', companyId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
};
