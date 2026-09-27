const crypto = require('crypto');
const supabase = require('../supabaseClient');
const emailService = require('../services/emailService');

const invitationController = {
  async inviteUser(req, res) {
    try {
      const groupId = req.params.id;
      const { email, role_id } = req.body;
      const company_id = req.company_id;

      //Validaciones
      if (!email || !role_id) {
        return res.status(400).json({ error: 'El correo y el rol son obligatorios' });
      }

      //Validación de que el grupo y el rol pertenecen a la empresa del usuario
      const { data: group, error: groupErr } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .eq('company_id', company_id)
        .single();

      if (groupErr || !group) {
        return res.status(404).json({ error: 'Grupo no encontrado o no pertenece a tu empresa' });
      }

      const { data: role, error: roleErr } = await supabase
        .from('roles')
        .select('name')
        .eq('id', role_id)
        .eq('company_id', company_id)
        .single();

      if (roleErr || !role) {
        return res.status(404).json({ error: 'Rol no encontrado o no pertenece a tu empresa' });
      }

      //Revisa si ya existe una invitación pendiente para el mismo correo y empresa
      const { data: existingInvite, error: inviteErr } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', email)
        .eq('company_id', company_id)
        .eq('status', 'pendiente')
        .maybeSingle();

      if (inviteErr) throw inviteErr;
      if (existingInvite) {
        return res.status(409).json({ error: 'Ya existe una invitación pendiente para este correo en tu empresa' });
      }

      //Genera un token seguro y una fecha de expiración para la invitación
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Valido por 7 días

      //Guarda la invitación en la base de datos con estado 'pendiente'
      const { data: inviteData, error: saveError } = await supabase
        .from('invitations')
        .insert([
          {
            email,
            group_id: groupId,
            role_id,
            company_id,
            token,
            expires_at: expiresAt.toISOString(),
            status: 'pendiente'
          }
        ])
        .select()
        .single();

      if (saveError) throw saveError;

      //Enviar correo electrónico con el token de invitación
      const emailResult = await emailService.sendInvitation(
        email,
        token,
        group.name,
        role.name
      );

      if (!emailResult.success) {
        // Actualiza el estado de la invitación a 'fallida' si el envío del correo falla
        await supabase
          .from('invitations')
          .update({ status: 'fallida' })
          .eq('id', inviteData.id);

        return res.status(502).json({ 
          error: 'La invitación se registró pero hubo un error al enviar el correo.', 
          detail: emailResult.error 
        });
      }

      return res.status(201).json({
        message: 'Invitación enviada exitosamente',
        invitationId: inviteData.id
      });

    } catch (error) {
      console.error('Invitation Error:', error);
      return res.status(500).json({ error: 'Error interno del servidor al procesar la invitación' });
    }
  }
};

module.exports = invitationController;
