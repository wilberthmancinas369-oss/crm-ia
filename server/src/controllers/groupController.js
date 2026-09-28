const supabase = require('../supabaseClient');

/**
 * Controlador para manejar operaciones relacionadas con grupos.
 */
const groupController = {
  async createGroup(req, res) {
    try {
      const { name, description } = req.body;
      const company_id = req.company_id; //Injecta el company_id en la solicitud

      // 1. Input Validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
      }

      if (name.length > 100) {
        return res.status(400).json({ error: 'El nombre del grupo no puede exceder los 100 caracteres' });
      }

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
        .insert([
          { name, description, company_id }
        ])
        .select()
        .single();

      if (createError) throw createError;

      return res.status(201).json({
        message: 'Grupo creado exitosamente',
        group: newGroup
      });

    } catch (error) {
      console.error('Group Creation Error:', error);
      return res.status(500).json({ error: 'Error interno del servidor al crear el grupo' });
    }
  }
};

module.exports = groupController;
