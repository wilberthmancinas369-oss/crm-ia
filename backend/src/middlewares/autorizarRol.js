import { perfilService } from '../services/perfil.service.js';
import { gruposConPermiso } from '../config/permisos.js';

/**
 * Middleware de autorización por permiso (config/permisos.js). Debe ir después de `autenticar`.
 * Exige que el usuario tenga el permiso en al menos un grupo (o en toda la empresa) y deja:
 * - req.company_id: empresa del usuario (nunca del body), para filtrar por empresa
 * - req.perfil: perfil con el rol en cada grupo
 * - req.alcance: grupos donde puede ejercer el permiso; null = toda la empresa (Administrador)
 * Los controladores filtran sus consultas con req.alcance y validan el grupo del recurso que tocan.
 */
export const autorizar = (permiso) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const perfil = await perfilService.obtener(user.id);

      if (!perfil) {
        return res.status(403).json({ error: 'Tu cuenta no pertenece a ninguna empresa' });
      }

      if (perfil.grupos.length === 0) {
        return res.status(403).json({ error: 'El usuario no tiene un rol asignado en la empresa' });
      }

      const alcance = gruposConPermiso(perfil, permiso);
      if (alcance !== null && alcance.length === 0) {
        return res.status(403).json({ error: 'No tienes permisos suficientes para realizar esta acción' });
      }

      req.company_id = perfil.empresa.id;
      req.perfil = perfil;
      req.alcance = alcance;
      next();
    } catch (error) {
      console.error('Error de autorización:', error);
      res.status(500).json({ error: 'Error interno del servidor al validar permisos' });
    }
  };
};
