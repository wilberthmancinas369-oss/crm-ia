// Prueba manual de integración del flujo HU-2: invitar -> aceptar -> rol asignado.
// Usa la base de datos real del .env y envía un correo real con Resend.
// Uso: reemplazar los IDs de abajo y ejecutar `node scripts/probarFlujoInvitacion.js` desde backend/
import 'dotenv/config';
import supabase from '../src/config/supabase.js';
import { invitarUsuario, aceptarInvitacion } from '../src/controllers/invitaciones.controller.js';

const mockRes = () => ({
  status(c) { this.statusCode = c; return this; },
  json(d) { this.data = d; return this; },
});

async function runFlowTest() {
  try {
    const testData = {
      email: `test-${Date.now()}@example.com`,
      role_id: 'REEMPLAZAR_CON_ID_DE_ROL_REAL',
      groupId: 'REEMPLAZAR_CON_ID_DE_GRUPO_REAL',
      company_id: 'REEMPLAZAR_CON_ID_DE_EMPRESA_REAL',
      userId: 'REEMPLAZAR_CON_ID_DE_USUARIO_REAL'
    };

    const reqInvite = {
      params: { id: testData.groupId },
      body: { email: testData.email, role_id: testData.role_id },
      company_id: testData.company_id
    };
    const resInvite = mockRes();
    await invitarUsuario(reqInvite, resInvite);
    if (resInvite.statusCode !== 201) throw new Error('Error en invitarUsuario: ' + JSON.stringify(resInvite.data));

    const { data: invite } = await supabase.from('invitations').select('token').eq('email', testData.email).single();

    const reqAccept = { body: { token: invite.token }, user: { id: testData.userId } };
    const resAccept = mockRes();
    await aceptarInvitacion(reqAccept, resAccept);
    if (resAccept.statusCode !== 200) throw new Error('Error en aceptarInvitacion: ' + JSON.stringify(resAccept.data));

    const { data: assignment } = await supabase
      .from('user_group_role')
      .select('*')
      .eq('user_id', testData.userId)
      .eq('group_id', testData.groupId)
      .single();

    if (assignment) console.log('✅ Flujo exitoso: rol asignado.');
    else throw new Error('Rol no asignado en DB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runFlowTest();
