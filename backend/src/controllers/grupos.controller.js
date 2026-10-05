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

// Grupos de la empresa con sus miembros (nombre, correo, rol) e invitaciones pendientes
export const listGruposConMiembros = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        id, name, description, created_at,
        user_group_role ( assigned_at, profiles ( id, full_name, email ), roles ( name, level ) ),
        invitations ( id, email, status, expires_at, roles ( name ) )
      `)
      .eq('company_id', req.company_id)
      .eq('invitations.status', 'pendiente')
      .order('name');

    if (error) throw error;

    const ahora = new Date();
    const grupos = data.map((grupo) => ({
      id: grupo.id,
      nombre: grupo.name,
      descripcion: grupo.description,
      creado: grupo.created_at,
      miembros: grupo.user_group_role
        .map((m) => ({
          id: m.profiles.id,
          nombre: m.profiles.full_name,
          email: m.profiles.email,
          rol: m.roles.name,
          nivel: m.roles.level,
          desde: m.assigned_at
        }))
        // Primero los roles más altos, luego por nombre
        .sort((a, b) => b.nivel - a.nivel || (a.nombre || '').localeCompare(b.nombre || '')),
      // Las vencidas siguen como 'pendiente' hasta que alguien abre el enlace; aquí no se muestran
      invitacionesPendientes: grupo.invitations
        .filter((i) => new Date(i.expires_at) > ahora)
        .map((i) => ({ id: i.id, email: i.email, rol: i.roles.name, expira: i.expires_at }))
    }));

    return res.json(grupos);
  } catch (error) {
    console.error('Error al listar grupos con miembros:', error);
    return res.status(500).json({ error: 'Error interno del servidor al listar los grupos' });
  }
};
