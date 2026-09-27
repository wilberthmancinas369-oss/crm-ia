import supabase from '../config/supabase.js';

export const contactosService = {
  // Obtener todos los contactos
  async getAll() {
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener un contacto por ID incluyendo sus oportunidades e interacciones asociadas
  async getById(id) {
    const { data, error } = await supabase
      .from('contactos')
      .select(`
        *,
        oportunidades (*),
        interacciones (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Crear un nuevo contacto
  async create(contactoData) {
    const { data, error } = await supabase
      .from('contactos')
      .insert([contactoData])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Actualizar un contacto existente
  async update(id, contactoData) {
    const { data, error } = await supabase
      .from('contactos')
      .update(contactoData)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Eliminar un contacto
  async delete(id) {
    const { data, error } = await supabase
      .from('contactos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};