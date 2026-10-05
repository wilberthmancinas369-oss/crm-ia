// Prueba manual de integración del flujo HU-2/HU-3: invitar -> aceptar (crea la cuenta) -> rol asignado.
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
      company_id: 'REEMPLAZAR_CON_ID_DE_EMPRESA_REAL'
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

    const reqAccept = { params: { token: invite.token }, body: { nombre: 'Usuario de Prueba', password: 'prueba1234' } };
    const resAccept = mockRes();
    await aceptarInvitacion(reqAccept, resAccept);
    if (resAccept.statusCode !== 201) throw new Error('Error en aceptarInvitacion: ' + JSON.stringify(resAccept.data));

    // La cuenta la crea aceptarInvitacion; su id es el del perfil con ese correo
    const { data: perfil } = await supabase.from('profiles').select('id').eq('email', testData.email).single();

    const { data: assignment } = await supabase
      .from('user_group_role')
      .select('*')
      .eq('user_id', perfil.id)
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
