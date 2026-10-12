import supabase from '../config/supabase.js';
import { filtrarPorGrupos } from './alcance.service.js';

// Evita que el body cambie la empresa o el grupo dueño del registro
const soloDatos = ({ company_id, group_id, grupo_id, id, ...datos }) => datos;

// `ambito` = { companyId, alcance } (ver contactos.service.js)
export const oportunidadesService = {
  // Obtener todas las oportunidades visibles
  async getAll({ companyId, alcance }) {
    const { data, error } = await filtrarPorGrupos(
      supabase.from('oportunidades').select('*, contactos(nombre, apellido)').eq('company_id', companyId),
      alcance
    ).order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener una oportunidad por ID (null si no está en su alcance)
  async getById(id, { companyId, alcance }) {
    const { data, error } = await filtrarPorGrupos(
      supabase
        .from('oportunidades')
        .select('*, contactos(nombre, apellido)')
        .eq('id', id)
        .eq('company_id', companyId),
      alcance
    ).maybeSingle();

    if (error) throw error;
    return data;
  },

  // Crear una oportunidad en el grupo ya validado por el controlador
  async create(data, { companyId }, grupoId) {
    const { data: oportunidad, error } = await supabase
      .from('oportunidades')
      .insert([{ ...soloDatos(data), company_id: companyId, group_id: grupoId }])
      .select()
      .single();

    if (error) throw error;
    return oportunidad;
  },

  // Actualizar una oportunidad (null si no está en su alcance)
  async update(id, { companyId, alcance }, data) {
    const { data: filas, error } = await filtrarPorGrupos(
      supabase
        .from('oportunidades')
        .update(soloDatos(data))
        .eq('id', id)
        .eq('company_id', companyId),
      alcance
    ).select();

    if (error) throw error;
    return filas[0] ?? null;
  },

  // Eliminar una oportunidad (false si no está en su alcance)
  async delete(id, { companyId, alcance }) {
    const { data, error } = await filtrarPorGrupos(
      supabase
        .from('oportunidades')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId),
      alcance
    ).select('id');

    if (error) throw error;
    return data.length > 0;
  }
};
