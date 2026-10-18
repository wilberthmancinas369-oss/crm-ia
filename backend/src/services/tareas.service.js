import supabase from '../config/supabase.js';
import { buscarContactoVisible, buscarOportunidadVisible, filtrarPorGrupos } from './alcance.service.js';

export const tareasService = {
  async getMisTareas(responsableId, { companyId, alcance }) {
    // Cada consulta hereda el grupo de su vínculo; !inner excluye tareas del otro tipo.
    const consultas = [
      ['contactos', 'id, nombre, apellido, group_id'],
      ['oportunidades', 'id, nombre_oportunidad, group_id']
    ].map(([tabla, campos]) => filtrarPorGrupos(
      supabase.from('tareas').select(`*, ${tabla}!inner(${campos})`)
        .eq('company_id', companyId).eq('responsable_id', responsableId),
      alcance, `${tabla}.group_id`
    ));
    const resultados = await Promise.all(consultas);
    for (const resultado of resultados) if (resultado.error) throw resultado.error;
    return resultados.flatMap(({ data }) => data)
      .sort((a, b) => new Date(a.fecha_limite) - new Date(b.fecha_limite));
  },

  // La tarea hereda el alcance del contacto o la oportunidad vinculados.
  async getById(id, ambito) {
    const { data, error } = await supabase.from('tareas').select('*')
      .eq('id', id).eq('company_id', ambito.companyId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const vinculo = data.contacto_id
      ? await buscarContactoVisible(data.contacto_id, ambito)
      : await buscarOportunidadVisible(data.oportunidad_id, ambito);
    return vinculo ? data : null;
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

  async responsableExiste(id, { companyId }) {
    const { data, error } = await supabase.from('profiles').select('id')
      .eq('id', id).eq('company_id', companyId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
};
