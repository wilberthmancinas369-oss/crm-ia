import supabase from '../config/supabase.js';
import { NIVELES } from '../config/permisos.js';

// HU-9: consultas y cambios sobre la membresía de los usuarios (user_group_role).
// Las reglas de quién puede hacer qué viven en config/permisos.js; aquí solo se lee y escribe,
// siempre filtrando por empresa.
// user_group_role no tiene columna id: una membresía se identifica por (user_id, group_id), su llave primaria.
const llave = (m) => `${m.user_id}:${m.group_id}`;

// Filtra una consulta a la membresía { user_id, group_id } dentro de la empresa
const deLaMembresia = (consulta, { user_id, group_id }, companyId) =>
  consulta.eq('user_id', user_id).eq('group_id', group_id).eq('company_id', companyId);

export const usuarioService = {
  /** Rol de un usuario en un grupo de la empresa: { user_id, group_id, role_id, nivel } o null si no es miembro. */
  async obtenerMembresia(userId, groupId, companyId) {
    const { data, error } = await supabase
      .from('user_group_role')
      .select('user_id, group_id, role_id, roles(level)')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return data
      ? { user_id: data.user_id, group_id: data.group_id, role_id: data.role_id, nivel: data.roles.level }
      : null;
  },

  async obtenerRol(roleId, companyId) {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
      .eq('id', roleId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async grupoExiste(groupId, companyId) {
    const { data, error } = await supabase
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  },

  /**
   * ¿La empresa se quedaría sin Administrador si se quitan (o bajan de rol) estas membresías?
   * Cuenta usuarios distintos con rol Administrador en algún grupo, sin contar esas membresías.
   */
  async dejariaSinAdministrador(membresiasQuitadas, companyId) {
    const { data, error } = await supabase
      .from('user_group_role')
      .select('user_id, group_id, roles(level)')
      .eq('company_id', companyId);

    if (error) throw error;
    const quitadas = new Set(membresiasQuitadas.map(llave));
    const admins = new Set(
      data.filter((m) => m.roles.level >= NIVELES.ADMINISTRADOR && !quitadas.has(llave(m))).map((m) => m.user_id)
    );
    return admins.size === 0;
  },

  // Todas las membresías del usuario en la empresa: [{ user_id, group_id }]
  async membresiasDe(userId, companyId) {
    const { data, error } = await supabase
      .from('user_group_role')
      .select('user_id, group_id')
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (error) throw error;
    return data;
  },

  async actualizarRol(membresia, roleId, companyId) {
    const { data, error } = await deLaMembresia(
      supabase.from('user_group_role').update({ role_id: roleId }), membresia, companyId
    )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Cambia el grupo de la membresía en un solo UPDATE (conserva el rol): no hay un momento intermedio
  // en que el usuario quede fuera de ambos grupos
  async moverDeGrupo(membresia, newGroupId, companyId) {
    const { data, error } = await deLaMembresia(
      supabase.from('user_group_role').update({ group_id: newGroupId }), membresia, companyId
    )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async perfilEnEmpresa(userId, companyId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Elimina la cuenta de la empresa y de Supabase Auth.
   * Sus tareas (responsable obligatorio) pasan a quien elimina; sus oportunidades quedan sin
   * responsable (la llave lo pone en NULL) para que el Jefe las reasigne con HU-7.
   * Al borrar el usuario de Auth, la base borra en cascada su perfil y sus membresías.
   */
  async eliminarDeEmpresa(userId, companyId, reasignarA) {
    const { data: tareas, error: tareasError } = await supabase
      .from('tareas')
      .update({ responsable_id: reasignarA, recordatorio_enviado_at: null })
      .eq('responsable_id', userId)
      .eq('company_id', companyId)
      .select('id');

    // Sin la migración de tareas (HU-6) no hay nada que reasignar
    if (tareasError && !['42P01', 'PGRST205'].includes(tareasError.code)) throw tareasError;

    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return { tareasReasignadas: tareas?.length ?? 0 };
  }
};
