const supabase = require('../config/supabase');

const oportunidadesService = {
  // CREATE: Crear una nueva oportunidad
  async create(data) {
    const { data: oportunidad, error } = await supabase
      .from('oportunidades')
      .insert([data])
      .select()
      .single();
    
    if (error) throw error;
    return oportunidad;
  },

  // READ: Obtener todas las oportunidades de una empresa
  async getAll(empresaId) {
    const { data, error } = await supabase
      .from('oportunidades')
      .select('*, contactos(nombre, apellido)') // Join con contactos para saber de quién es la oportunidad
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // READ: Obtener una oportunidad específica
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

  // UPDATE: Actualizar oportunidad
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

  // DELETE: Eliminar oportunidad
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

module.exports = oportunidadesService;
