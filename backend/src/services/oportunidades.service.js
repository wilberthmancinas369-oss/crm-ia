import supabase from '../config/supabase.js';

// Evita que el body cambie la empresa dueña del registro
const sinCompanyId = ({ company_id, id, ...datos }) => datos;

export const oportunidadesService = {
  // Obtener todas las oportunidades de una empresa (Multi-tenant)
  async getAll(companyId) {
    const { data, error } = await supabase
      .from('oportunidades')
      .select('*, contactos(nombre, apellido)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener una oportunidad por ID y empresa
  async getById(id, companyId) {
    const { data, error } = await supabase
      .from('oportunidades')
      .select('*, contactos(nombre, apellido)')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    return data;
  },

  // Crear una oportunidad
  async create(data, companyId) {
    const { data: oportunidad, error } = await supabase
      .from('oportunidades')
      .insert([{ ...data, company_id: companyId }])
      .select()
      .single();

    if (error) throw error;
    return oportunidad;
  },

  // Actualizar una oportunidad
  async update(id, companyId, data) {
    const { data: oportunidad, error } = await supabase
      .from('oportunidades')
      .update(sinCompanyId(data))
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    return oportunidad;
  },

  // Eliminar una oportunidad
  async delete(id, companyId) {
    const { error } = await supabase
      .from('oportunidades')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
    return true;
  }
};
