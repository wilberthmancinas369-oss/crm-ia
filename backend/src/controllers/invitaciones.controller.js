import crypto from 'crypto';
import supabase from '../config/supabase.js';
import { emailService } from '../services/email.service.js';
import { NIVELES } from '../config/permisos.js';

// Busca una invitación por token con los nombres de empresa, grupo y rol.
// Devuelve { invitacion } si se puede aceptar, o { status, error } si no.
async function buscarInvitacionVigente(token) {
  const { data: invitacion, error } = await supabase
    .from('invitations')
    .select('id, email, status, expires_at, companies(name), groups(name), roles(name)')
    .eq('token', token)
    .maybeSingle();

  if (error) throw error;

  if (!invitacion) {
    return { status: 404, error: 'Esta invitación no existe. Revisa que el enlace esté completo.' };
  }

  if (invitacion.status === 'aceptada') {
    return { status: 409, error: 'Esta invitación ya fue aceptada. Inicia sesión con tu cuenta.' };
  }

  if (invitacion.status === 'expirada' || new Date() > new Date(invitacion.expires_at)) {
    if (invitacion.status === 'pendiente') {
      await supabase.from('invitations').update({ status: 'expirada' }).eq('id', invitacion.id);
    }
    return { status: 410, error: 'Esta invitación expiró. Pide a quien te invitó que te envíe una nueva.' };
  }

  if (invitacion.status !== 'pendiente') {
    return { status: 409, error: 'Esta invitación ya no es válida. Pide a quien te invitó que te envíe una nueva.' };
  }

  return { invitacion };
}

// GET /api/invitaciones/:token (pública): datos para la pantalla de aceptar invitación
export const obtenerInvitacion = async (req, res) => {
  try {
    const { invitacion, status, error } = await buscarInvitacionVigente(req.params.token);
    if (!invitacion) return res.status(status).json({ error });

    return res.json({
      email: invitacion.email,
      empresa: invitacion.companies.name,
      grupo: invitacion.groups.name,
      rol: invitacion.roles.name,
      expira: invitacion.expires_at
    });
  } catch (error) {
    console.error('Error al consultar invitación:', error);
    return res.status(500).json({ error: 'Error interno al consultar la invitación' });
  }
};

// POST /api/invitaciones/:token/aceptar (pública): crea las credenciales del invitado en
// Supabase Auth y lo asocia a la empresa, grupo y rol de la invitación.
export const aceptarInvitacion = async (req, res) => {
  const { token } = req.params;
  const { nombre, password } = req.body;

  try {
    // 1. Validar antes de crear nada, para no dejar cuentas de invitaciones vencidas
    const { invitacion, status, error } = await buscarInvitacionVigente(token);
    if (!invitacion) return res.status(status).json({ error });

    // 2. Crear las credenciales. El correo se toma de la invitación, nunca del body, y se
    // marca como confirmado porque ya se comprobó al recibir el enlace en ese correo.
    const { data: creado, error: authError } = await supabase.auth.admin.createUser({
      email: invitacion.email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo: nombre.trim() }
    });

    if (authError) {
      if (authError.code === 'email_exists' || authError.code === 'user_already_exists') {
        return res.status(409).json({
          error: 'Ya existe una cuenta con este correo. Inicia sesión; por ahora una cuenta solo puede pertenecer a una empresa.'
        });
      }
      if (authError.code === 'weak_password') {
        return res.status(400).json({ error: 'La contraseña es demasiado débil. Usa una más larga o combina letras, números y símbolos.' });
      }
      throw authError;
    }

    const userId = creado.user.id;

    // 3. Perfil, grupo, rol y estado de la invitación en una sola transacción
    // (función de backend/db/migrations/hu3_aceptar_invitacion.sql)
    const { error: rpcError } = await supabase.rpc('aceptar_invitacion', {
      p_token: token,
      p_user_id: userId,
      p_nombre: nombre
    });

    if (rpcError) {
      // Si no se pudo asociar, se borra la cuenta para no dejar un usuario sin empresa
      const { error: rollbackError } = await supabase.auth.admin.deleteUser(userId);
      if (rollbackError) console.error('No se pudo revertir la cuenta del invitado:', userId, rollbackError);

      if (rpcError.message?.includes('INVITACION_EXPIRADA')) {
        return res.status(410).json({ error: 'Esta invitación expiró. Pide a quien te invitó que te envíe una nueva.' });
      }
      if (rpcError.message?.includes('INVITACION_INVALIDA')) {
        return res.status(409).json({ error: 'Esta invitación ya no es válida.' });
      }
      throw rpcError;
    }

    return res.status(201).json({ message: 'Cuenta creada. Ya puedes entrar al CRM.', email: invitacion.email });
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

    // Una cuenta solo puede pertenecer a una empresa: si el correo ya tiene perfil, no se podría aceptar
    const { data: existingProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (existingProfile) {
      return res.status(409).json({ error: 'Este correo ya tiene una cuenta en el CRM' });
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
