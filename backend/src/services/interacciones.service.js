import supabase from '../config/supabase.js';

// Evita que el body cambie la empresa dueña del registro
const sinCompanyId = ({ company_id, id, ...datos }) => datos;

// Todas las consultas filtran por company_id: cada empresa solo ve y modifica sus interacciones
export const interaccionesService = {
  // Obtener todas las interacciones (incluye datos básicos del contacto y la oportunidad si existe).
  // Con oportunidadId devuelve solo las de esa oportunidad.
  async getAll(companyId, { oportunidadId } = {}) {
    let query = supabase
      .from('interacciones')
      .select(`
        *,
        contactos (id, nombre, apellido, email),
        oportunidades (id, nombre_oportunidad)
      `)
      .eq('company_id', companyId);

    if (oportunidadId) query = query.eq('oportunidad_id', oportunidadId);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener una interacción por ID
  async getById(id, companyId) {
    const { data, error } = await supabase
      .from('interacciones')
      .select(`
        *,
        contactos (id, nombre, apellido, email),
        oportunidades (id, nombre_oportunidad)
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    return data;
  },

  // Obtener todas las interacciones asociadas a un contacto específico
  async getByContactoId(contactoId, companyId) {
    const { data, error } = await supabase
      .from('interacciones')
      .select(`
        *,
        oportunidades (id, nombre_oportunidad)
      `)
      .eq('contacto_id', contactoId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Crear una nueva interacción
  async create(interaccionData, companyId) {
    const { data, error } = await supabase
      .from('interacciones')
      .insert([{ ...interaccionData, company_id: companyId }])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Actualizar una interacción
  async update(id, interaccionData, companyId) {
    const { data, error } = await supabase
      .from('interacciones')
      .update(sinCompanyId(interaccionData))
      .eq('id', id)
      .eq('company_id', companyId)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Eliminar una interacción
  async delete(id, companyId) {
    const { error } = await supabase
      .from('interacciones')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
    return true;
  }
};
