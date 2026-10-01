import { perfilService } from '../services/perfil.service.js';

// Datos de la cuenta en sesión: empresa, rol, grupos y permisos (los usa el frontend para el menú)
export const obtenerMiPerfil = async (req, res) => {
  try {
    const perfil = await perfilService.obtener(req.user.id);

    if (!perfil) {
      return res.status(403).json({
        error: 'Tu cuenta no pertenece a ninguna empresa. Si te invitaron, acepta primero la invitación.'
      });
    }

    return res.json(perfil);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return res.status(500).json({ error: 'Error interno del servidor al obtener tu perfil' });
  }
};
