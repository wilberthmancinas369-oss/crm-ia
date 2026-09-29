import supabase from '../config/supabase.js';
import axios from 'axios';
import crypto from 'crypto';

export const invitacionesService = {
  async createInvitation({ email, groupId, rol }) {
    // 1. Validar que el correo no tenga una invitación pendiente o ya tenga cuenta
    const { data: existingInvitation, error: inviteError } = await supabase
      .from('invitaciones')
      .select('id')
      .eq('email', email)
      .is('used_at', null)
      .single();

    if (inviteError && inviteError.code !== 'PGRST116') throw inviteError;
    if (existingInvitation) {
      throw new Error('Ya existe una invitación pendiente para este correo.');
    }

    // Nota: La validación de si el usuario ya existe en Supabase Auth 
    // se hace usualmente mediante el admin API o verificando la tabla 'profiles'.
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') throw profileError;
    if (existingProfile) {
      throw new Error('Este correo ya tiene una cuenta registrada.');
    }

    // 2. Generar token único y fecha de expiración (7 días)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 3. Guardar en base de datos
    const { data: invitation, error: dbError } = await supabase
      .from('invitaciones')
      .insert([{ 
        token, 
        email, 
        group_id: groupId, 
        rol, 
        expires_at: expiresAt.toISOString() 
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // 4. Enviar correo vía Brevo
    await this.sendInvitationEmail(email, token);

    return invitation;
  },

  async sendInvitationEmail(email, token) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const registrationLink = `http://localhost:5173/invitacion/${token}`; // Cambiar por URL de prod en el futuro

    if (!apiKey || !senderEmail) {
      console.error('❌ Error: Faltan variables BREVO_API_KEY o BREVO_SENDER_EMAIL');
      throw new Error('Configuración de correo no disponible.');
    }

    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { email: senderEmail },
          to: [{ email: email }],
          subject: 'Invitación para unirte al CRM con IA',
          htmlContent: `
            <html>
              <body>
                <h1>¡Te han invitado a unirte al CRM!</h1>
                <p>Haz clic en el siguiente enlace para completar tu registro:</p>
                <p><a href="${registrationLink}">Completar Registro</a></p>
                <p>Este enlace expirará en 7 días.</p>
              </body>
            </html>
          `,
        },
        {
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('❌ Error enviando email via Brevo:', error.response?.data || error.message);
      // No lanzamos el error para que la invitación quede creada aunque el email falle, 
      // pero podríamos marcarlo en la DB.
      throw new Error('Invitación creada, pero hubo un problema al enviar el correo.');
    }
  }
};
