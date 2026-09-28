import supabase from '../config/supabase.js';

/**
 * Middleware para autorizar a los usuarios según su nivel de rol.
 * Jerarquía: Agente (0) -> Jefe de Área (1) -> Administrador (2)
 * Debe ir después de `autenticar`, que llena req.user.
 */
export const autorizarRol = (minLevel) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // 1. Obtener el nivel de rol más alto del usuario en todos sus grupos.
      // PostgREST no ordena las filas padre por una columna embebida, así que el máximo se calcula aquí.
      const { data: asignaciones, error: roleError } = await supabase
        .from('user_group_role')
        .select('roles(level)')
        .eq('user_id', user.id);

      if (roleError || !asignaciones?.length) {
        return res.status(403).json({ error: 'El usuario no tiene un rol asignado en la empresa' });
      }

      const userLevel = Math.max(...asignaciones.map((a) => a.roles.level));

      // 2. Verificar si el nivel del usuario cumple con el requisito mínimo
      if (userLevel < minLevel) {
        return res.status(403).json({
          error: 'No tienes permisos suficientes para realizar esta acción. Se requiere nivel ' + minLevel
        });
      }

      // 3. Adjuntar company_id a la solicitud para los controladores (evita fugas entre empresas)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return res.status(404).json({ error: 'Perfil de usuario no encontrado' });
      }

      req.company_id = profile.company_id;
      next();
    } catch (error) {
      console.error('Error de autorización:', error);
      res.status(500).json({ error: 'Error interno del servidor al validar permisos' });
    }
  };
};
