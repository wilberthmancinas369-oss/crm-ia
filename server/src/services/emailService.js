const { Resend } = require('resend');

/**
 * Servicio de correo electrónico utilizando Resend
 * Elegido por su SDK simple y generoso plan gratuito.
 */
const resend = new Resend(process.env.RESEND_API_KEY);

const emailService = {
  /**
   * Envia un correo electrónico de invitación transaccional.
   * @param {string} to - Recipiente del correo electrónico.
   * @param {string} token - Token de invitación para generar el enlace.
   * @param {string} groupName - Nombre del grupo al que se está invitando.
   * @param {string} roleName - Nombre del rol asignado al invitado.
   */
  async sendInvitation(to, token, groupName, roleName) {
    const invitationLink = `${process.env.FRONTEND_URL}/invitacion/${token}`;

    try {
      const data = await resend.emails.send({
        from: process.env.RESEND_EMAIL_FROM || 'onboarding@resend.dev',
        to: [to],
        subject: `Invitación para unirte a ${groupName}`,
        html: this.getInvitationTemplate(invitationLink, groupName, roleName),
      });

      return { success: true, data };
    } catch (error) {
      console.error('Resend Email Error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * HTML Template for the invitation email.
   */

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

module.exports = emailService;
