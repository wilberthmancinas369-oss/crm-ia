import supabase from '../config/supabase.js';
import { filtrarPorGrupos } from './alcance.service.js';

// Evita que el body cambie la empresa dueña del registro
const soloDatos = ({ company_id, id, ...datos }) => datos;

// Las interacciones no tienen grupo propio: heredan el de su contacto. `contactos!inner` hace que
// el filtro por contactos.group_id descarte las interacciones de contactos fuera del alcance.
const CON_CONTACTO = `
  *,
  contactos!inner (id, nombre, apellido, email, group_id),
  oportunidades (id, nombre_oportunidad)
`;

// `ambito` = { companyId, alcance } (ver contactos.service.js)
export const interaccionesService = {
  // Todas las interacciones visibles; con oportunidadId, solo las de esa oportunidad
  async getAll({ companyId, alcance }, { oportunidadId } = {}) {
    let query = filtrarPorGrupos(
      supabase.from('interacciones').select(CON_CONTACTO).eq('company_id', companyId),
      alcance,
      'contactos.group_id'
    );

    if (oportunidadId) query = query.eq('oportunidad_id', oportunidadId);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener una interacción por ID (null si no está en su alcance)
  async getById(id, { companyId, alcance }) {
    const { data, error } = await filtrarPorGrupos(
      supabase.from('interacciones').select(CON_CONTACTO).eq('id', id).eq('company_id', companyId),
      alcance,
      'contactos.group_id'
    ).maybeSingle();

    if (error) throw error;
    return data;
  },

  // Interacciones de un contacto (el controlador verifica antes que el contacto esté en su alcance)
  async getByContactoId(contactoId, { companyId }) {
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

  // Crear una nueva interacción (el controlador valida contacto y oportunidad)
  async create(interaccionData, { companyId }) {
    const { data, error } = await supabase
      .from('interacciones')
      .insert([{ ...soloDatos(interaccionData), company_id: companyId }])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Actualizar una interacción ya verificada por el controlador
  async update(id, interaccionData, { companyId }) {
    const { data, error } = await supabase
      .from('interacciones')
      .update(soloDatos(interaccionData))
      .eq('id', id)
      .eq('company_id', companyId)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Eliminar una interacción ya verificada por el controlador
  async delete(id, { companyId }) {
    const { error } = await supabase
      .from('interacciones')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
    return true;
  }
};
