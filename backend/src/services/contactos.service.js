import supabase from '../config/supabase.js';

const contactosService = {
  // CREATE: Crear un nuevo contacto
  async create(data) {
    const { data: contacto, error } = await supabase
      .from('contactos')
      .insert([data])
      .select()
      .single();
    
    if (error) throw error;
    return contacto;
  },

  // READ: Obtener todos los contactos de una empresa (Multi-tenant)
  async getAll(empresaId) {
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // READ: Obtener un solo contacto por ID y empresa
  async getById(id, empresaId) {
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // UPDATE: Actualizar datos de un contacto
  async update(id, empresaId, data) {
    const { data: contacto, error } = await supabase
      .from('contactos')
      .update(data)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();
    
    if (error) throw error;
    return contacto;
  },

  // DELETE: Eliminar un contacto
  async delete(id, empresaId) {
    const { error } = await supabase
      .from('contactos')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);
    
    if (error) throw error;
    return true;
  }
};

export default contactosService;
