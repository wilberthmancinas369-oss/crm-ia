import supabase from '../config/supabase.js';

// Evita que el body cambie la empresa dueña del registro
const sinCompanyId = ({ company_id, id, ...datos }) => datos;

// Todas las consultas filtran por company_id: cada empresa solo ve y modifica sus contactos
export const contactosService = {
  // Obtener todos los contactos
  async getAll(companyId) {
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener un contacto por ID incluyendo sus oportunidades e interacciones asociadas
  async getById(id, companyId) {
    const { data, error } = await supabase
      .from('contactos')
      .select(`
        *,
        oportunidades (*),
        interacciones (*)
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    return data;
  },

  // Crear un nuevo contacto
  async create(contactoData, companyId) {
    const { data, error } = await supabase
      .from('contactos')
      .insert([{ ...contactoData, company_id: companyId }])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Actualizar un contacto existente
  async update(id, contactoData, companyId) {
    const { data, error } = await supabase
      .from('contactos')
      .update(sinCompanyId(contactoData))
      .eq('id', id)
      .eq('company_id', companyId)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Eliminar un contacto
  async delete(id, companyId) {
    const { error } = await supabase
      .from('contactos')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
    return true;
  }
};
