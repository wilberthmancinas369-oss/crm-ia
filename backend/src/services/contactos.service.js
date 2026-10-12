import supabase from '../config/supabase.js';
import { filtrarPorGrupos } from './alcance.service.js';

// Evita que el body cambie la empresa o el grupo dueño del registro
const soloDatos = ({ company_id, group_id, grupo_id, id, ...datos }) => datos;

// `ambito` = { companyId, alcance }: empresa del usuario y grupos que puede ver (null = toda la empresa).
// Todas las consultas filtran por los dos: fuera de su alcance, un contacto "no existe" (HU-11).
export const contactosService = {
  // Obtener todos los contactos
  async getAll({ companyId, alcance }) {
    const { data, error } = await filtrarPorGrupos(
      supabase.from('contactos').select('*').eq('company_id', companyId),
      alcance
    ).order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener un contacto por ID incluyendo sus oportunidades e interacciones asociadas
  async getById(id, { companyId, alcance }) {
    const { data, error } = await filtrarPorGrupos(
      supabase
        .from('contactos')
        .select(`
          *,
          oportunidades (*),
          interacciones (*)
        `)
        .eq('id', id)
        .eq('company_id', companyId),
      alcance
    ).maybeSingle();

    if (error) throw error;
    return data;
  },

  // Crear un nuevo contacto en el grupo ya validado por el controlador
  async create(contactoData, { companyId }, grupoId) {
    const { data, error } = await supabase
      .from('contactos')
      .insert([{ ...soloDatos(contactoData), company_id: companyId, group_id: grupoId }])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Actualizar un contacto existente (devuelve undefined si no está en su alcance)
  async update(id, contactoData, { companyId, alcance }) {
    const { data, error } = await filtrarPorGrupos(
      supabase
        .from('contactos')
        .update(soloDatos(contactoData))
        .eq('id', id)
        .eq('company_id', companyId),
      alcance
    ).select();

    if (error) throw error;
    return data[0];
  },

  // Eliminar un contacto (devuelve false si no está en su alcance)
  async delete(id, { companyId, alcance }) {
    const { data, error } = await filtrarPorGrupos(
      supabase
        .from('contactos')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId),
      alcance
    ).select('id');

    if (error) throw error;
    return data.length > 0;
  }
};
