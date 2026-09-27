import supabase from '../config/supabase.js';

export const oportunidadesService = {
  // Obtener todas las oportunidades
  async getAll() {
    const { data, error } = await supabase
      .from('oportunidades')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener una oportunidad por ID con los datos del contacto asociado
  async getById(id) {
    const { data, error } = await supabase
      .from('oportunidades')
      .select(`
        *,
        contactos (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Crear una oportunidad
  async create(oportunidadData) {
    const { data, error } = await supabase
      .from('oportunidades')
      .insert([oportunidadData])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Actualizar una oportunidad
  async update(id, oportunidadData) {
    const { data, error } = await supabase
      .from('oportunidades')
      .update(oportunidadData)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Eliminar una oportunidad
  async delete(id) {
    const { data, error } = await supabase
      .from('oportunidades')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};