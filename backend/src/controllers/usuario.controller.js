import { usuarioService } from '../services/usuario.service.js';
import { NIVELES, puedeEnGrupo, puedeGestionarMiembro } from '../config/permisos.js';

// HU-9: administrar usuarios. Las reglas (docs/HU11-matriz-permisos.md) salen de config/permisos.js:
// - Nadie se modifica a sí mismo por esta vía.
// - Jefe de Área: solo Agentes de los grupos que dirige, y solo hacia Agente.
// - Administrador: cualquier miembro, hasta Jefe de Área (el rol Administrador no se asigna aquí).
// - La empresa nunca se queda sin Administrador.
// La empresa sale del perfil (middleware autorizar), nunca del body.

const ULTIMO_ADMIN = 'No puedes dejar a la empresa sin Administrador';

export const usuarioController = {
  // POST /api/usuarios/cambiar-rol  { userId, groupId, roleId }
  async cambiarRol(req, res) {
    try {
      const { userId, groupId, roleId } = req.body;
      const { company_id, perfil } = req;

      if (userId === perfil.usuario.id) {
        return res.status(403).json({ error: 'No puedes cambiar tu propio rol' });
      }

      const membresia = await usuarioService.obtenerMembresia(userId, groupId, company_id);
      if (!membresia) return res.status(404).json({ error: 'El usuario no pertenece a ese grupo' });

      const rol = await usuarioService.obtenerRol(roleId, company_id);
      if (!rol) return res.status(404).json({ error: 'El rol especificado no existe en tu empresa' });

      if (!puedeGestionarMiembro(perfil, groupId, { id: userId, nivel: membresia.nivel }, rol.level)) {
        return res.status(403).json({ error: `No puedes asignar el rol ${rol.name} a este usuario en este grupo` });
      }

      if (rol.id === membresia.role_id) {
        return res.status(400).json({ error: `El usuario ya tiene el rol ${rol.name} en este grupo` });
      }

      if (membresia.nivel >= NIVELES.ADMINISTRADOR &&
          await usuarioService.dejariaSinAdministrador([membresia.id], company_id)) {
        return res.status(409).json({ error: ULTIMO_ADMIN });
      }

      const resultado = await usuarioService.actualizarRol(membresia.id, rol.id, company_id);
      return res.json({ message: 'Rol actualizado exitosamente', user: resultado });
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      return res.status(500).json({ error: 'Error interno del servidor al cambiar el rol' });
    }
  },

  // POST /api/usuarios/mover-grupo  { userId, oldGroupId, newGroupId } — conserva su rol
  async moverGrupo(req, res) {
    try {
      const { userId, oldGroupId, newGroupId } = req.body;
      const { company_id, perfil } = req;

      if (userId === perfil.usuario.id) {
        return res.status(403).json({ error: 'No puedes moverte a ti mismo de grupo' });
      }
      if (oldGroupId === newGroupId) {
        return res.status(400).json({ error: 'El grupo de destino es el mismo que el actual' });
      }

      const membresia = await usuarioService.obtenerMembresia(userId, oldGroupId, company_id);
      if (!membresia) return res.status(404).json({ error: 'El usuario no pertenece al grupo de origen' });

      // Debe poder sacarlo del grupo de origen y gestionar miembros en el de destino
      if (!puedeGestionarMiembro(perfil, oldGroupId, { id: userId, nivel: membresia.nivel }) ||
          !puedeEnGrupo(perfil, 'gestionarMiembros', newGroupId)) {
        return res.status(403).json({ error: 'Solo puedes mover usuarios entre grupos que gestionas' });
      }

      if (!(await usuarioService.grupoExiste(newGroupId, company_id))) {
        return res.status(404).json({ error: 'El grupo de destino no existe en tu empresa' });
      }
      if (await usuarioService.obtenerMembresia(userId, newGroupId, company_id)) {
        return res.status(409).json({ error: 'El usuario ya pertenece al grupo de destino' });
      }

      const resultado = await usuarioService.moverDeGrupo(membresia.id, newGroupId, company_id);
      return res.json({ message: 'Usuario movido de grupo exitosamente', user: resultado });
    } catch (error) {
      console.error('Error al mover grupo:', error);
      return res.status(500).json({ error: 'Error interno del servidor al mover al usuario' });
    }
  },

  // POST /api/usuarios/remover-grupo  { userId, groupId }
  async removerGrupo(req, res) {
    try {
      const { userId, groupId } = req.body;
      const { company_id, perfil } = req;

      if (userId === perfil.usuario.id) {
        return res.status(403).json({ error: 'No puedes removerte a ti mismo de un grupo' });
      }

      const membresia = await usuarioService.obtenerMembresia(userId, groupId, company_id);
      if (!membresia) return res.status(404).json({ error: 'El usuario no pertenece a ese grupo' });

      if (!puedeGestionarMiembro(perfil, groupId, { id: userId, nivel: membresia.nivel })) {
        return res.status(403).json({ error: 'No puedes remover a este usuario de este grupo' });
      }

      // Sin grupo no tendría ningún permiso: se le mueve a otro grupo o se elimina de la empresa
      if ((await usuarioService.membresiasDe(userId, company_id)).length <= 1) {
        return res.status(409).json({
          error: 'Es el único grupo del usuario. Muévelo a otro grupo o elimínalo de la empresa.'
        });
      }

      if (membresia.nivel >= NIVELES.ADMINISTRADOR &&
          await usuarioService.dejariaSinAdministrador([membresia.id], company_id)) {
        return res.status(409).json({ error: ULTIMO_ADMIN });
      }

      const resultado = await usuarioService.quitarMembresia(membresia.id, company_id);
      return res.json({ message: 'Usuario removido del grupo exitosamente', user: resultado });
    } catch (error) {
      console.error('Error al remover grupo:', error);
      return res.status(500).json({ error: 'Error interno del servidor al remover al usuario' });
    }
  },

  // POST /api/usuarios/eliminar-empresa  { userId } — solo Administrador (administrarUsuarios)
  async eliminarDeEmpresa(req, res) {
    try {
      const { userId } = req.body;
      const { company_id, perfil } = req;

      if (userId === perfil.usuario.id) {
        return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta de la empresa' });
      }

      const usuario = await usuarioService.perfilEnEmpresa(userId, company_id);
      if (!usuario) return res.status(404).json({ error: 'El usuario no pertenece a tu empresa' });

      const membresias = await usuarioService.membresiasDe(userId, company_id);
      if (await usuarioService.dejariaSinAdministrador(membresias, company_id)) {
        return res.status(409).json({ error: ULTIMO_ADMIN });
      }

      const resultado = await usuarioService.eliminarDeEmpresa(userId, company_id, perfil.usuario.id);
      return res.json({ message: 'Usuario eliminado definitivamente de la empresa', resultado });
    } catch (error) {
      console.error('Error al eliminar usuario de la empresa:', error);
      return res.status(500).json({ error: 'Error interno del servidor al eliminar el usuario' });
    }
  }
};
