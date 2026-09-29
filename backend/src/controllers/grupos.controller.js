import supabase from '../config/supabase.js';

// Las validaciones de formato (nombre obligatorio, longitud) viven en grupos.routes.js
export const createGrupo = async (req, res) => {
  try {
    const { name, description } = req.body;
    const company_id = req.company_id; // Inyectado por el middleware autorizarRol

    // Verifica si ya existe un grupo con el mismo nombre en la misma empresa
    const { data: existingGroup, error: checkError } = await supabase
      .from('groups')
      .select('id')
      .eq('company_id', company_id)
      .eq('name', name)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingGroup) {
      return res.status(409).json({ error: 'Ya existe un grupo con este nombre en tu empresa' });
    }

    // Crea el grupo en la base de datos y devuelve el nuevo grupo creado
    const { data: newGroup, error: createError } = await supabase
      .from('groups')
      .insert([{ name, description, company_id }])
      .select()
      .single();

    if (createError) throw createError;

    return res.status(201).json({
      message: 'Grupo creado exitosamente',
      group: newGroup
    });
  } catch (error) {
    console.error('Error al crear grupo:', error);
    return res.status(500).json({ error: 'Error interno del servidor al crear el grupo' });
  }
};

// Lista los grupos de la empresa del usuario (para el selector de Invitar usuario)
export const listGrupos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, description')
      .eq('company_id', req.company_id)
      .order('name');

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    console.error('Error al listar grupos:', error);
    return res.status(500).json({ error: 'Error interno del servidor al listar los grupos' });
  }
};
