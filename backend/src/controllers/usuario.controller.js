import supabase from '../config/supabase.js';
import { usuarioService } from '../services/usuario.service.js';
import { NIVELES } from '../config/permisos.js';

export const usuarioController = {
  /**
   * Cambia el rol de un usuario en un grupo.
   * POST /api/usuarios/cambiar-rol
   */
  async cambiarRol(req, res) {
    try {
      const { userId, groupId, roleId } = req.body;
      const { company_id, perfil } = req; // Inyectados por autorizarRol

      if (!userId || !groupId || !roleId) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios (userId, groupId, roleId)' });
      }

      // 1. Nadie puede cambiarse el rol a sí mismo
      if (userId === req.user.id) {
        return res.status(403).json({ error: 'No puedes cambiar tu propio rol' });
      }

      // 2. Validar jerarquía de permisos
      // El Administrador puede todo. El Jefe de Área solo a usuarios de su grupo y roles <= Jefe de Área.
      if (perfil.rol.nivel < NIVELES.ADMINISTRADOR) {
        // Es Jefe de Área (nivel 1)
        
        // Verificar que el usuario destino está en el grupo que el Jefe de Área gestiona
        const { data: membership, error: memberError } = await supabase
          .from('user_group_role')
          .select('group_id')
          .eq('user_id', userId)
          .eq('group_id', groupId)
          .maybeSingle();

        if (memberError) throw memberError;
        if (!membership) {
          return res.status(403).json({ error: 'Solo puedes cambiar roles de usuarios que pertenezcan a tu grupo' });
        }

        // Verificar que el Jefe de Área sea realmente el jefe de ese grupo (esté asignado a él)
        const { data: jefeCheck, error: jefeError } = await supabase
          .from('user_group_role')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('group_id', groupId)
          .maybeSingle();

        if (jefeError) throw jefeError;
        if (!jefeCheck) {
          return res.status(403).json({ error: 'No eres miembro del grupo que intentas gestionar' });
        }

        // No puede asignar un rol superior al suyo (no puede crear Admins)
        const { data: nuevoRol, error: roleError } = await supabase
          .from('roles')
          .select('level')
          .eq('id', roleId)
          .maybeSingle();

        if (roleError) throw roleError;
        if (!nuevoRol) return res.status(404).json({ error: 'El rol especificado no existe' });
        if (nuevoRol.level > perfil.rol.nivel) {
          return res.status(403).json({ error: 'No puedes asignar un rol superior al tuyo' });
        }
      }

      // 3. Verificar que no se deje a la empresa sin administrador
      const esAdminUnico = await usuarioService.verificarAdminUnico(userId, company_id);
      if (esAdminUnico) {
        // Verificar si el nuevo rol sigue siendo administrador
        const { data: nuevoRol, error: roleError } = await supabase
          .from('roles')
          .select('level')
          .eq('id', roleId)
          .maybeSingle();

        if (roleError) throw roleError;
        if (nuevoRol.level < NIVELES.ADMINISTRADOR) {
          return res.status(400).json({ error: 'No puedes remover al último administrador de la empresa' });
        }
      }

      const resultado = await usuarioService.actualizarRolEnGrupo(userId, groupId, roleId, company_id);
      return res.json({ message: 'Rol actualizado exitosamente', user: resultado });
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      if (error.message.includes('no pertenece')) return res.status(403).json({ error: error.message });
      return res.status(500).json({ error: 'Error interno del servidor al cambiar el rol' });
    }
  },

  /**
   * Mueve un usuario de un grupo a otro.
   * POST /api/usuarios/mover-grupo
   */
  async moverGrupo(req, res) {
    try {
      const { userId, oldGroupId, newGroupId } = req.body;
      const { company_id, perfil } = req;

      if (!userId || !oldGroupId || !newGroupId) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios (userId, oldGroupId, newGroupId)' });
      }

      if (userId === req.user.id) {
        return res.status(403).json({ error: 'No puedes moverte a ti mismo de grupo' });
      }

      // Validación de permisos similar a cambiar rol
      if (perfil.rol.nivel < NIVELES.ADMINISTRADOR) {
        const { data: jefeCheck, error: jefeError } = await supabase
          .from('user_group_role')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('group_id', oldGroupId)
          .maybeSingle();

        if (jefeError) throw jefeError;
        if (!jefeCheck) {
          return res.status(403).json({ error: 'Solo puedes mover usuarios de grupos que gestionas' });
        }
      }

      const resultado = await usuarioService.moverUsuarioDeGrupo(userId, oldGroupId, newGroupId, company_id);
      return res.json({ message: 'Usuario movido de grupo exitosamente', user: resultado });
    } catch (error) {
      console.error('Error al mover grupo:', error);
      return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
  },

  /**
   * Remueve a un usuario de un grupo.
   * POST /api/usuarios/remover-grupo
   */
  async removerGrupo(req, res) {
    try {
      const { userId, groupId } = req.body;
      const { company_id, perfil } = req;

      if (!userId || !groupId) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios (userId, groupId)' });
      }

      if (userId === req.user.id) {
        return res.status(403).json({ error: 'No puedes removerte a ti mismo de un grupo' });
      }

      if (perfil.rol.nivel < NIVELES.ADMINISTRADOR) {
        const { data: jefeCheck, error: jefeError } = await supabase
          .from('user_group_role')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('group_id', groupId)
          .maybeSingle();

        if (jefeError) throw jefeError;
        if (!jefeCheck) {
          return res.status(403).json({ error: 'Solo puedes remover usuarios de grupos que gestionas' });
        }
      }

      // Verificar que no se elimine al último administrador
      const esAdminUnico = await usuarioService.verificarAdminUnico(userId, company_id);
      if (esAdminUnico) {
        return res.status(400).json({ error: 'No puedes remover al último administrador de la empresa' });
      }

      const resultado = await usuarioService.removerUsuarioDeGrupo(userId, groupId, company_id);
      return res.json({ message: 'Usuario removido del grupo exitosamente', user: resultado });
    } catch (error) {
      console.error('Error al remover grupo:', error);
      return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
  },

  /**
   * Elimina a un usuario completamente de la empresa.
   * POST /api/usuarios/eliminar-empresa
   */
  async eliminarDeEmpresa(req, res) {
    try {
      const { userId } = req.body;
      const { company_id, perfil } = req;

      if (!userId) {
        return res.status(400).json({ error: 'Falta el ID del usuario' });
      }

      if (userId === req.user.id) {
        return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta de la empresa' });
      }

      // Solo el Administrador puede eliminar usuarios definitivamente de la empresa
      if (perfil.rol.nivel < NIVELES.ADMINISTRADOR) {
        return res.status(403).json({ error: 'Solo el Administrador de la Empresa puede eliminar usuarios definitivamente' });
      }

      const resultado = await usuarioService.eliminarUsuarioDeEmpresa(userId, company_id);
      return res.json({ message: 'Usuario eliminado definitivamente de la empresa', resultado });
    } catch (error) {
      console.error('Error al eliminar usuario de la empresa:', error);
      return res.status(500).json({ error: error.message || 'Error interno del servidor al eliminar el usuario' });
    }
  }
};
