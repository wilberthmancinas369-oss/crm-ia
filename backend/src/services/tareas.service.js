import supabase from '../config/supabase.js';
import { buscarContactoVisible, buscarOportunidadVisible } from './alcance.service.js';

export const tareasService = {
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
