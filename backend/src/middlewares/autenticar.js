import supabase from '../config/supabase.js';

/**
 * Valida el JWT de Supabase enviado en el header Authorization: Bearer <token>
 * y deja al usuario autenticado en req.user.
 */
export const autenticar = async (req, res, next) => {
  const [tipo, token] = (req.headers.authorization || '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }

  req.user = data.user;
  next();
};
