import supabase from '../config/supabase.js';
import { filtrarPorGrupos, listarAsignables } from '../services/alcance.service.js';

// Las validaciones de formato (nombre obligatorio, longitud) viven en grupos.routes.js
export const createGrupo = async (req, res) => {
  try {
    const { name, description } = req.body;
    const company_id = req.company_id; // Inyectado por el middleware autorizar

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

// Escapa % y _ para que el nombre se compare como texto literal en ilike
const escaparLike = (texto) => texto.replace(/[\\%_]/g, '\\$&');

// Renombra un grupo. El nombre no puede repetirse dentro de la empresa (sin distinguir mayúsculas).
export const renombrarGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const company_id = req.company_id; // Inyectado por el middleware autorizar

    // El grupo debe existir y pertenecer a la empresa del usuario
    const { data: grupo, error: grupoError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', id)
      .eq('company_id', company_id)
      .maybeSingle();

    if (grupoError) throw grupoError;

    if (!grupo) {
      return res.status(404).json({ error: 'El grupo no existe en tu empresa' });
    }

    // Verifica que ningún OTRO grupo de la empresa tenga ya ese nombre
    const { data: duplicado, error: duplicadoError } = await supabase
      .from('groups')
      .select('id')
      .eq('company_id', company_id)
      .ilike('name', escaparLike(name))
      .neq('id', id)
      .limit(1)
      .maybeSingle();

    if (duplicadoError) throw duplicadoError;

    if (duplicado) {
      return res.status(409).json({ error: 'Ya existe un grupo con este nombre en tu empresa' });
    }

    // Si el nombre es exactamente el mismo, no hay nada que actualizar
    if (grupo.name === name) {
      return res.json({ message: 'El grupo ya tiene ese nombre', group: grupo });
    }

    const { data: actualizado, error: updateError } = await supabase
      .from('groups')
      .update({ name })
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({
      message: 'Grupo renombrado exitosamente',
      group: actualizado
    });
  } catch (error) {
    // 23505: violación de unicidad (dos renombres simultáneos al mismo nombre)
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un grupo con este nombre en tu empresa' });
    }
    console.error('Error al renombrar grupo:', error);
    return res.status(500).json({ error: 'Error interno del servidor al renombrar el grupo' });
  }
};

// Elimina un grupo vacío y cancela sus invitaciones pendientes, todo en una transacción (RPC eliminar_grupo)
export const eliminarGrupo = async (req, res) => {
  try {
    const { data: canceladas, error } = await supabase.rpc('eliminar_grupo', {
      p_group_id: req.params.id,
      p_company_id: req.company_id // Inyectado por el middleware autorizar
    });

    if (error) {
      const mensaje = error.message || '';

      // 22P02: el id no es un UUID válido
      if (mensaje.includes('GRUPO_NO_ENCONTRADO') || error.code === '22P02') {
        return res.status(404).json({ error: 'El grupo no existe en tu empresa' });
      }
      if (mensaje.includes('GRUPO_CON_MIEMBROS')) {
        return res.status(409).json({ error: 'No se puede eliminar un grupo que tiene miembros. Muévelos a otro grupo primero.' });
      }
      if (mensaje.includes('GRUPO_CON_DATOS')) {
        return res.status(409).json({ error: 'No se puede eliminar un grupo que tiene contactos u oportunidades.' });
      }
      // 23503: otra tabla todavía referencia al grupo
      if (error.code === '23503') {
        return res.status(409).json({ error: 'No se puede eliminar el grupo porque tiene información asociada.' });
      }
      throw error;
    }

    return res.json({
      message: 'Grupo eliminado exitosamente',
      invitacionesCanceladas: canceladas
    });
  } catch (error) {
    console.error('Error al eliminar grupo:', error);
    return res.status(500).json({ error: 'Error interno del servidor al eliminar el grupo' });
  }
};

// Lista los grupos visibles para el usuario: los suyos, o todos si es Administrador
export const listGrupos = async (req, res) => {
  try {
    const { data, error } = await filtrarPorGrupos(
      supabase.from('groups').select('id, name, description').eq('company_id', req.company_id),
      req.alcance,
      'id'
    ).order('name');

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    console.error('Error al listar grupos:', error);
    return res.status(500).json({ error: 'Error interno del servidor al listar los grupos' });
  }
};

// Grupos con sus miembros (nombre, correo, rol) e invitaciones pendientes.
// Jefe de Área: solo los grupos que dirige. Administrador: todos.
export const listGruposConMiembros = async (req, res) => {
  try {
    const { data, error } = await filtrarPorGrupos(
      supabase
        .from('groups')
        .select(`
          id, name, description, created_at,
          user_group_role ( assigned_at, profiles ( id, full_name, email ), roles ( name, level ) ),
          invitations ( id, email, status, expires_at, roles ( name ) )
        `)
        .eq('company_id', req.company_id)
        .eq('invitations.status', 'pendiente'),
      req.alcance,
      'id'
    ).order('name');

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

// Quién puede ser responsable o colaborador de oportunidades del grupo: sus miembros y los
// administradores. Lo usan los formularios de oportunidades (HU 4.1).
export const listAsignables = async (req, res) => {
  try {
    return res.json(await listarAsignables(req.params.id, req.company_id));
  } catch (error) {
    console.error('Error al listar asignables:', error);
    return res.status(500).json({ error: 'Error interno del servidor al listar los usuarios del grupo' });
  }
};
