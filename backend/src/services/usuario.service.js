import supabase from '../config/supabase.js';
import { NIVELES } from '../config/permisos.js';

export const usuarioService = {
  /**
   * Cambia el rol de un usuario en un grupo específico.
   * @param {string} userId - ID del usuario a modificar.
   * @param {string} groupId - ID del grupo donde se cambia el rol.
   * @param {string} roleId - ID del nuevo rol.
   * @param {number} companyId - ID de la empresa para aislamiento.
   */
  async actualizarRolEnGrupo(userId, groupId, roleId, companyId) {
    // Verificar que el usuario y el grupo pertenecen a la misma empresa
    const { data: check, error: checkError } = await supabase
      .from('user_group_role')
      .select('company_id')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .maybeSingle();

    if (checkError) throw checkError;
    if (!check || check.company_id !== companyId) {
      throw new Error('El usuario no pertenece a este grupo o a esta empresa');
    }

    const { data, error } = await supabase
      .from('user_group_role')
      .update({ role_id: roleId })
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mueve un usuario de un grupo a otro.
   * @param {string} userId - ID del usuario.
   * @param {string} oldGroupId - ID del grupo actual.
   * @param {string} newGroupId - ID del nuevo grupo.
   * @param {number} companyId - ID de la empresa.
   */
  async moverUsuarioDeGrupo(userId, oldGroupId, newGroupId, companyId) {
    // 1. Verificar que el nuevo grupo pertenece a la empresa
    const { data: groupCheck, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('id', newGroupId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (groupError) throw groupError;
    if (!groupCheck) throw new Error('El grupo de destino no existe o no pertenece a la empresa');

    // 2. Obtener el rol actual del usuario en el grupo antiguo
    const { data: currentAssignment, error: assignError } = await supabase
      .from('user_group_role')
      .select('role_id')
      .eq('user_id', userId)
      .eq('group_id', oldGroupId)
      .maybeSingle();

    if (assignError) throw assignError;
    if (!currentAssignment) throw new Error('El usuario no pertenece al grupo de origen');

    // 3. Transacción conceptual: Remover de antiguo e insertar en nuevo
    // Usamos .select() para verificar que realmente se borró una fila
    const { data: deletedData, error: deleteError } = await supabase
      .from('user_group_role')
      .delete()
      .eq('user_id', userId)
      .eq('group_id', oldGroupId)
      .select();

    if (deleteError) throw deleteError;
    
    if (!deletedData || deletedData.length === 0) {
      throw new Error('El usuario no pertenece al grupo de origen; no se puede realizar el movimiento');
    }

    const { data: newAssignment, error: insertError } = await supabase
      .from('user_group_role')
      .insert([
        { 
          user_id: userId, 
          group_id: newGroupId, 
          role_id: currentAssignment.role_id, 
          company_id: companyId 
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;
    return newAssignment;
  },

  /**
   * Remueve a un usuario de un grupo.
   * @param {string} userId - ID del usuario.
   * @param {string} groupId - ID del grupo.
   * @param {number} companyId - ID de la empresa.
   */
  async removerUsuarioDeGrupo(userId, groupId, companyId) {
    const { data, error } = await supabase
      .from('user_group_role')
      .delete()
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('El usuario no pertenecía al grupo especificado');
    
    return data;
  },

  /**
   * Verifica si la empresa quedaría sin administradores si se cambia el rol de un usuario.
   * @param {string} userId - ID del usuario.
   * @param {number} companyId - ID de la empresa.
   */
  async verificarAdminUnico(userId, companyId) {
    const { data: admins, error } = await supabase
      .from('user_group_role')
      .select('user_id, roles(level)')
      .eq('company_id', companyId)
      .eq('roles.level', NIVELES.ADMINISTRADOR);

    if (error) throw error;
    
    if (admins && admins.length === 1 && admins[0].user_id === userId) {
      return true; // Es el único admin
    }
    return false;
  }
};
