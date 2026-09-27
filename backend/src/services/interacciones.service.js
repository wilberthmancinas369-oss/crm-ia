import supabase from '../config/supabase.js';

export const interaccionesService = {
  // Obtener todas las interacciones (incluye datos básicos del contacto y la oportunidad si existe)
  async getAll() {
    const { data, error } = await supabase
      .from('interacciones')
      .select(`
        *,
        contactos (id, nombre, apellido, email),
        oportunidades (id, nombre_oportunidad)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener una interacción por ID
  async getById(id) {
    const { data, error } = await supabase
      .from('interacciones')
      .select(`
        *,
        contactos (id, nombre, apellido, email),
        oportunidades (id, nombre_oportunidad)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Obtener todas las interacciones asociadas a un contacto específico
  async getByContactoId(contactoId) {
    const { data, error } = await supabase
      .from('interacciones')
      .select(`
        *,
        oportunidades (id, nombre_oportunidad)
      `)
      .eq('contacto_id', contactoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Crear una nueva interacción
  async create(interaccionData) {
    const { data, error } = await supabase
      .from('interacciones')
      .insert([interaccionData])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Actualizar una interacción
  async update(id, interaccionData) {
    const { data, error } = await supabase
      .from('interacciones')
      .update(interaccionData)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Eliminar una interacción
  async delete(id) {
    const { data, error } = await supabase
      .from('interacciones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};