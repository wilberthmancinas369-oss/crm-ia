import { Resend } from 'resend';

/**
 * Servicio de correo electrónico utilizando Resend
 * Elegido por su SDK simple y generoso plan gratuito.
 */
// Se crea al primer envío: los imports de ESM se evalúan antes del dotenv.config() de app.js,
// y new Resend() lanza error sin API key, lo que tumbaría todo el servidor al arrancar
let resend;
const getResend = () => (resend ??= new Resend(process.env.RESEND_API_KEY));

export const emailService = {
  /**
   * Envía un correo electrónico de invitación transaccional.
   * @param {string} to - Destinatario del correo electrónico.
   * @param {string} token - Token de invitación para generar el enlace.
   * @param {string} groupName - Nombre del grupo al que se está invitando.
   * @param {string} roleName - Nombre del rol asignado al invitado.
   */
  async sendInvitation(to, token, groupName, roleName) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Debe coincidir con la ruta pública /invitacion/:token de frontend/src/routes/AppRoutes.jsx
    const invitationLink = `${frontendUrl}/invitacion/${token}`;

    try {
      const { data, error } = await getResend().emails.send({
        from: process.env.RESEND_EMAIL_FROM || 'onboarding@resend.dev',
        to: [to],
        subject: `Invitación para unirte a ${groupName}`,
        html: this.getInvitationTemplate(invitationLink, groupName, roleName),
      });

      // El SDK de Resend devuelve los errores en `error` en lugar de lanzarlos
      if (error) throw new Error(error.message);

      return { success: true, data };
    } catch (error) {
      console.error('Error de Resend:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Genera el contenido HTML del correo electrónico de invitación.
   */
  getInvitationTemplate(link, groupName, roleName) {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">¡Has sido invitado a un equipo!</h2>
        <p style="color: #666; font-size: 16px;">
          Hola,<br><br>
          Te han invitado a unirte al grupo <strong>${groupName}</strong> con el rol de <strong>${roleName}</strong>.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Aceptar Invitación
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
          Este enlace expirará en 7 días. Si no fuiste tú, puedes ignorar este correo.
        </p>
      </div>
    `;
  }
};
