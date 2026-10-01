import crypto from 'crypto';
import supabase from '../config/supabase.js';
import { emailService } from '../services/email.service.js';
import { NIVELES } from '../config/permisos.js';

export const aceptarInvitacion = async (req, res) => {
  try {
    const { token } = req.body;
    // El usuario sale de la sesión (middleware autenticar), no del body,
    // para que nadie pueda asignarle un rol a otro usuario con un token ajeno
    const user_id = req.user.id;

    // 1. Validar invitación por token
    const { data: invite, error: inviteErr } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pendiente')
      .single();

    if (inviteErr || !invite) {
      return res.status(404).json({ error: 'Invitación no válida o ya procesada' });
    }

    // 2. Verificar expiración
    if (new Date() > new Date(invite.expires_at)) {
      await supabase
        .from('invitations')
        .update({ status: 'expirada' })
        .eq('id', invite.id);
      return res.status(410).json({ error: 'La invitación ha expirado' });
    }

    // 3. Asignar el rol y grupo al usuario
    const { error: assignError } = await supabase
      .from('user_group_role')
      .insert([
        {
          user_id,
          group_id: invite.group_id,
          role_id: invite.role_id,
          company_id: invite.company_id
        }
      ]);

    if (assignError) throw assignError;

    // 4. Actualizar estado de la invitación
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ status: 'aceptada' })
      .eq('id', invite.id);

    if (updateError) throw updateError;

    return res.status(200).json({ message: 'Invitación aceptada y rol asignado exitosamente' });
  } catch (error) {
    console.error('Error al aceptar invitación:', error);
    return res.status(500).json({ error: 'Error interno al procesar la aceptación de la invitación' });
  }
};

export const invitarUsuario = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { email, role_id } = req.body;
    const company_id = req.company_id;

    // Validación de que el grupo y el rol pertenecen a la empresa del usuario
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
      .select('name, level')
      .eq('id', role_id)
      .eq('company_id', company_id)
      .single();

    if (roleErr || !role) {
      return res.status(404).json({ error: 'Rol no encontrado o no pertenece a tu empresa' });
    }

    if (role.level >= NIVELES.ADMINISTRADOR) {
      return res.status(403).json({ error: 'Solo se puede invitar con el rol de Agente o Jefe de Área' });
    }

    // Revisa si ya existe una invitación pendiente para el mismo correo y empresa
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

    // Genera un token seguro y una fecha de expiración para la invitación
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Válido por 7 días

    // Guarda la invitación en la base de datos con estado 'pendiente'
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

    // Enviar correo; el servicio arma el link /invitacion/:token del frontend
    const emailResult = await emailService.sendInvitation(email, token, group.name, role.name);

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
    console.error('Error al invitar usuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor al procesar la invitación' });
  }
};
