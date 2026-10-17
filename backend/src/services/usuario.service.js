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
   * Remueve a un usuario de un grupo. Si es su último grupo, lo mueve a "Sin Grupo".
   * @param {string} userId - ID del usuario.
   * @param {string} groupId - ID del grupo.
   * @param {number} companyId - ID de la empresa.
   */
  async removerUsuarioDeGrupo(userId, groupId, companyId) {
    // 1. Verificar cuántos grupos tiene el usuario en total en esta empresa
    const { data: todasAsignaciones, error: assignError } = await supabase
      .from('user_group_role')
      .select('group_id')
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (assignError) throw assignError;

    // 2. Si es su único grupo, no lo borramos simplemente, lo movemos al grupo "Sin Grupo"
    if (todasAsignaciones && todasAsignaciones.length <= 1) {
      // Buscar o crear el grupo "Sin Grupo"
      let { data: grupoDefault, error: gError } = await supabase
        .from('groups')
        .select('id')
        .eq('name', 'Sin Grupo')
        .eq('company_id', companyId)
        .maybeSingle();

      if (gError) throw gError;

      if (!grupoDefault) {
        const { data: newG, error: createError } = await supabase
          .from('groups')
          .insert([{ name: 'Sin Grupo', description: 'Grupo automático para usuarios sin asignación', company_id: companyId }])
          .select()
          .single();
        if (createError) throw createError;
        grupoDefault = newG;
      }

      // Si el usuario ya estaba en "Sin Grupo", simplemente lo borramos (aunque en este caso es su único grupo)
      if (groupId === grupoDefault.id) {
        const { data, error } = await supabase
          .from('user_group_role')
          .delete()
          .eq('user_id', userId)
          .eq('group_id', groupId)
          .eq('company_id', companyId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // Mover al usuario al grupo "Sin Grupo" con rol de Agente (rol más bajo)
      // Obtenemos el ID del rol Agente para esta empresa
      const { data: rolAgente, error: rError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'Agente')
        .eq('company_id', companyId)
        .maybeSingle();
      
      if (rError) throw rError;
      if (!rolAgente) throw new Error('No se encontró el rol Agente para esta empresa');

      // Ejecutar el movimiento
      return this.moverUsuarioDeGrupo(userId, groupId, grupoDefault.id, companyId);
    }

    // 3. Si tiene más de un grupo, lo borramos normalmente
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
  },

  /**
   * Elimina a un usuario completamente de la empresa y del sistema de autenticación.
   * @param {string} userId - ID del usuario a eliminar.
   * @param {number} companyId - ID de la empresa para validación.
   */
  async eliminarUsuarioDeEmpresa(userId, companyId) {
    // 1. Verificar que el usuario pertenece a la empresa antes de borrar
    const { data: perfil, error: pError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();

    if (pError) throw pError;
    if (!perfil || perfil.company_id !== companyId) {
      throw new Error('El usuario no pertenece a esta empresa');
    }

    // 2. Borrar asignaciones de grupo y roles
    const { error: assignError } = await supabase
      .from('user_group_role')
      .delete()
      .eq('user_id', userId);
    
    if (assignError) throw assignError;

    // 3. Borrar el perfil de la empresa
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) throw profileError;

    // 4. Borrar la cuenta de autenticación de Supabase
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return { success: true };
  }
};
