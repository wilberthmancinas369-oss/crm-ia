import { perfilService } from '../services/perfil.service.js';

/**
 * Middleware para autorizar a los usuarios según su nivel de rol.
 * Jerarquía: Agente (0) -> Jefe de Área (1) -> Administrador (2). Los niveles por permiso
 * están en config/permisos.js. Debe ir después de `autenticar`, que llena req.user.
 * Deja en la solicitud req.company_id (para filtrar por empresa) y req.perfil.
 */
export const autorizarRol = (minLevel) => {
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

      if (!perfil.rol) {
        return res.status(403).json({ error: 'El usuario no tiene un rol asignado en la empresa' });
      }

      if (perfil.rol.nivel < minLevel) {
        return res.status(403).json({ error: 'No tienes permisos suficientes para realizar esta acción' });
      }

      // company_id sale del perfil, nunca del body: evita fugas entre empresas
      req.company_id = perfil.empresa.id;
      req.perfil = perfil;
      next();
    } catch (error) {
      console.error('Error de autorización:', error);
      res.status(500).json({ error: 'Error interno del servidor al validar permisos' });
    }
  };
};
