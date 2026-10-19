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
  },

  async obtenerHistorialReasignaciones(oportunidadId, { companyId }) {
    const { data, error } = await supabase
      .from('oportunidad_reasignaciones')
      .select(`
        id,
        created_at,
        responsable_anterior_id,
        responsable_anterior:profiles!reasignaciones_anterior_fk (full_name),
        responsable_nuevo_id,
        responsable_nuevo:profiles!reasignaciones_nuevo_fk (full_name),
        reasignado_por,
        reasignado_por_usuario:profiles!reasignaciones_usuario_fk (full_name)
      `)
      .eq('oportunidad_id', oportunidadId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async reasignar(id, companyId, nuevoResponsableId, reasignadoPorId) {
    const { data, error } = await supabase.rpc('reasignar_oportunidad', {
      p_oportunidad_id: id,
      p_company_id: companyId,
      p_nuevo_responsable_id: nuevoResponsableId,
      p_reasignado_por: reasignadoPorId
    });

    if (error) throw error;
    
    const resultado = data[0];
    return {
      responsableAnterior: resultado.responsable_anterior,
      responsableNuevo: resultado.responsable_nuevo
    };
  }
};
