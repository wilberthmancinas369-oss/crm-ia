import supabase from '../config/supabase.js';

// Nivel del rol Administrador; solo se puede invitar como Agente (0) o Jefe de Área (1)
export const NIVEL_ADMIN = 2;

// Lista los roles de la empresa que se pueden asignar al invitar a un usuario
export const listRolesInvitables = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
      .eq('company_id', req.company_id)
      .lt('level', NIVEL_ADMIN)
      .order('level');

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    console.error('Error al listar roles:', error);
    return res.status(500).json({ error: 'Error interno del servidor al listar los roles' });
  }
};
