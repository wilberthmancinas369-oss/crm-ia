import supabase from '../config/supabase.js';
import { NIVELES, esAdministrador, rolMaximoAsignable } from '../config/permisos.js';


// Lista los roles de la empresa que el usuario puede asignar al invitar.
// Administrador: Agente y Jefe de Área. Jefe de Área: solo Agente (docs/HU11-matriz-permisos.md).
// Con ?grupo_id se calcula para ese grupo.
export const listRolesInvitables = async (req, res) => {
  try {
    const { grupo_id } = req.query;
    const maximo = grupo_id
      ? rolMaximoAsignable(req.perfil, grupo_id)
      : esAdministrador(req.perfil) ? NIVELES.JEFE_AREA : NIVELES.AGENTE;

    if (maximo === null) {
      return res.status(403).json({ error: 'No puedes invitar usuarios a este grupo' });
    }

    const { data, error } = await supabase
      .from('roles')
      .select('id, name, level')
      .eq('company_id', req.company_id)
      .lte('level', maximo)
      .order('level');

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    console.error('Error al listar roles:', error);
    return res.status(500).json({ error: 'Error interno del servidor al listar los roles' });
  }
};
