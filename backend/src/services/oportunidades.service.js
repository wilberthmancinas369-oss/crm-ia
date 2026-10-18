import supabase from '../config/supabase.js';
import { filtrarPorGrupos } from './alcance.service.js';

// Evita que el body cambie la empresa o el grupo dueño del registro
const soloDatos = ({ company_id, group_id, grupo_id, id, ...datos }) => datos;

// Hay dos caminos de oportunidades a profiles (responsable y colaboradores): se nombra la llave
const CAMPOS = `
  *,
  contactos (id, nombre, apellido, empresa_cliente),
  responsable:profiles!oportunidades_responsable_fk (id, full_name, email)
`;

// `ambito` = { companyId, alcance } (ver contactos.service.js)
export const oportunidadesService = {
  // Obtener todas las oportunidades visibles
  async getAll({ companyId, alcance }) {
    const { data, error } = await filtrarPorGrupos(
      supabase.from('oportunidades').select(CAMPOS).eq('company_id', companyId),
      alcance
    ).order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener una oportunidad por ID con sus colaboradores (null si no está en su alcance)
  async getById(id, { companyId, alcance }) {
    const { data, error } = await filtrarPorGrupos(
      supabase
        .from('oportunidades')
        .select(`
          ${CAMPOS},
          colaboradores:oportunidad_colaboradores (
            user_id, created_at,
            usuario:profiles!oportunidad_colaboradores_user_fk (id, full_name, email)
          )
        `)
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
      .select(CAMPOS)
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
    ).select(CAMPOS);

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
  },

  // ---------- Colaboradores (el controlador valida antes la oportunidad y los permisos) ----------

  async listarColaboradores(oportunidadId, { companyId }) {
    const { data, error } = await supabase
      .from('oportunidad_colaboradores')
      .select('user_id, created_at, usuario:profiles!oportunidad_colaboradores_user_fk (id, full_name, email)')
      .eq('oportunidad_id', oportunidadId)
      .eq('company_id', companyId)
      .order('created_at');

    if (error) throw error;
    return data;
  },

  // Devuelve false si ya era colaborador
  async agregarColaborador(oportunidadId, userId, { companyId }, agregadoPor) {
    const { data: existente, error: errorBusqueda } = await supabase
      .from('oportunidad_colaboradores')
      .select('user_id')
      .eq('oportunidad_id', oportunidadId)
      .eq('user_id', userId)
      .maybeSingle();
    if (errorBusqueda) throw errorBusqueda;
    if (existente) return false;

    const { error } = await supabase
      .from('oportunidad_colaboradores')
      .insert([{ oportunidad_id: oportunidadId, user_id: userId, company_id: companyId, agregado_por: agregadoPor }]);
    if (error) throw error;
    return true;
  },

  // Devuelve false si no era colaborador
  async quitarColaborador(oportunidadId, userId, { companyId }) {
    const { data, error } = await supabase
      .from('oportunidad_colaboradores')
      .delete()
      .eq('oportunidad_id', oportunidadId)
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .select('user_id');

    if (error) throw error;
    return data.length > 0;
  }
};
