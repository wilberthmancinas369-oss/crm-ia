import { Resend } from 'resend';

/**
 * Servicio de correo electrónico. Proveedores:
 * - Brevo (si hay BREVO_API_KEY): plan gratuito de 300 correos/día a cualquier destinatario;
 *   solo pide verificar el correo remitente, sin dominio propio.
 * - Resend (por defecto): sin dominio verificado solo envía al correo dueño de la cuenta.
 */
// Se crea al primer envío: los imports de ESM se evalúan antes del dotenv.config() de app.js,
// y new Resend() lanza error sin API key, lo que tumbaría todo el servidor al arrancar
let resend;
const getResend = () => (resend ??= new Resend(process.env.RESEND_API_KEY));

// Cada proveedor recibe { to, subject, html } y lanza un Error con el motivo si falla
const proveedores = {
  async brevo({ to, subject, html }) {
    const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || 'CRM con IA' },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });

    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(data.message || `Brevo respondió ${respuesta.status}`);
    return data;
  },

  async resend({ to, subject, html }) {
    const { data, error } = await getResend().emails.send({
      from: process.env.RESEND_EMAIL_FROM || 'onboarding@resend.dev',
      to: [to],
      subject,
      html
    });

    // El SDK de Resend devuelve los errores en `error` en lugar de lanzarlos
    if (error) throw new Error(error.message);
    return data;
  }
};

const proveedorActivo = () => (process.env.BREVO_API_KEY ? 'brevo' : 'resend');

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
    const proveedor = proveedorActivo();

    try {
      const data = await proveedores[proveedor]({
        to,
        subject: `Invitación para unirte a ${groupName}`,
        html: this.getInvitationTemplate(invitationLink, groupName, roleName)
      });

      return { success: true, data };
    } catch (error) {
      console.error(`Error de ${proveedor}:`, error);
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
