import supabase from '../config/supabase.js';
import { NIVELES } from '../config/permisos.js';

// Solo se puede invitar como Agente o Jefe de Área, nunca como Administrador

// Lista los roles de la empresa que se pueden asignar al invitar a un usuario
export const listRolesInvitables = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
      .eq('company_id', req.company_id)
      .lt('level', NIVELES.ADMINISTRADOR)
      .order('level');

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    console.error('Error al listar roles:', error);
    return res.status(500).json({ error: 'Error interno del servidor al listar los roles' });
  }
};
