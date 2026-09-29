import { invitacionesService } from '../services/invitaciones.service.js';

export const invitacionesController = {
  async sendInvitation(req, res) {
    try {
      const { email, groupId, rol } = req.body;

      if (!email || !groupId || !rol) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: email, groupId y rol.' });
      }

      const invitation = await invitacionesService.createInvitation({ email, groupId, rol });
      
      return res.status(201).json({ 
        message: `Invitación enviada a ${email}`, 
        invitation 
      });
    } catch (error) {
      console.error('Error en invitacionesController.sendInvitation:', error);
      return res.status(error.message ? 400 : 500).json({ error: error.message || 'Error interno del servidor' });
    }
  }
};
