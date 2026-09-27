/**
 * Middleware para autorizar a los usuarios según su nivel de rol.
 * Jerarquía: Agente (0) -> Jefe de Área (1) -> Administrador (2)
 */
const authorizeRole = (minLevel) => {
  return async (req, res, next) => {
    try {
      // 1. Obtener el usuario de la solicitud (poblado por un middleware de autenticación previo como supabase.auth.getUser())
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // 2. Obtener el nivel de rol más alto del usuario dentro de la empresa
      // Verificamos user_group_role y nos unimos con roles
      const { data: roleData, error: roleError } = await req.supabase
        .from('user_group_role')
        .select('roles(level)')
        .eq('user_id', user.id)
        .order('level', { ascending: false })
        .limit(1)
        .single();

      if (roleError || !roleData) {
        return res.status(403).json({ error: 'El usuario no tiene un rol asignado en la empresa' });
      }

      const userLevel = roleData.roles.level;

      // 3. Verificar si el nivel del usuario cumple con el requisito mínimo
      if (userLevel < minLevel) {
        return res.status(403).json({ 
          error: 'No tienes permisos suficientes para realizar esta acción. Se requiere nivel ' + minLevel 
        });
      }

      // Adjuntar company_id a la solicitud para su uso posterior en los controladores (previniendo filtración de inquilinos)
      const { data: profile, error: profileError } = await req.supabase
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
      console.error('Authorization Error:', error);
      res.status(500).json({ error: 'Error interno del servidor al validar permisos' });
    }
  };
};

module.exports = authorizeRole;
