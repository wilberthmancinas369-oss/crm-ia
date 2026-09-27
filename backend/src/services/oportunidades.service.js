import supabase from '../config/supabase.js';

export const oportunidadesService = {
  // Obtener todas las oportunidades de una empresa (Multi-tenant)
  async getAll(empresaId) {
    const { data, error } = await supabase
      .from('oportunidades')
      .select('*, contactos(nombre, apellido)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Obtener una oportunidad por ID y empresa
  async getById(id, empresaId) {
    const { data, error } = await supabase
      .from('oportunidades')
      .select('*, contactos(nombre, apellido)')
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Crear una oportunidad (Usando campos del diagrama: titulo, valor, etapa, fecha_cierre)
  async create(data) {
    const { data: oportunidad, error } = await supabase
      .from('oportunidades')
      .insert([data])
      .select()
      .single();
    
    if (error) throw error;
    return oportunidad;
  },

  // Actualizar una oportunidad
  async update(id, empresaId, data) {
    const { data: oportunidad, error } = await supabase
      .from('oportunidades')
      .update(data)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();
    
    if (error) throw error;
    return oportunidad;
  },

  // Eliminar una oportunidad
  async delete(id, empresaId) {
    const { error } = await supabase
      .from('oportunidades')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);
    
    if (error) throw error;
    return true;
  }
};

// El export ya se define al inicio con "export const oportunidadesService"

