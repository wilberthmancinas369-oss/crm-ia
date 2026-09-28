const supabase = require('../server/src/supabaseClient');
const invitationController = require('../server/src/controllers/invitationController');

async function runFlowTest() {
    try {
        const testData = {
            email: `test-${Date.now()}@example.com`,
            role_id: 'REEMPLAZAR_CON_ID_DE_ROL_REAL', 
            groupId: 'REEMPLAZAR_CON_ID_DE_GRUPO_REAL',
            company_id: 'REEMPLAZAR_CON_ID_DE_EMPRESA_REAL',
            userId: 'REEMPLAZAR_CON_ID_DE_USUARIO_REAL'
        };

        const reqInvite = { params: { id: testData.groupId }, body: { email: testData.email, role_id: testData.role_id }, company_id: testData.company_id };
        const resInvite = { status: function(c) { this.statusCode = c; return this; }, json: function(d) { this.data = d; return this; } };
        await invitationController.inviteUser(reqInvite, resInvite);
        if (resInvite.statusCode !== 201) throw new Error('Error en inviteUser');

        const { data: invite } = await supabase.from('invitations').select('token').eq('email', testData.email).single();
        const token = invite.token;

        const reqAccept = { body: { token, user_id: testData.userId } };
        const resAccept = { status: function(c) { this.statusCode = c; return this; }, json: function(d) { this.data = d; return this; } };
        await invitationController.acceptInvitation(reqAccept, resAccept);
        if (resAccept.statusCode !== 200) throw new Error('Error en acceptInvitation');

        const { data: assignment } = await supabase.from('user_group_role').select('*').eq('user_id', testData.userId).eq('group_id', testData.groupId).single();
        
        if (assignment) console.log('? Flujo Exitoso: Rol asignado.');
        else throw new Error('Rol no asignado en DB');

    } catch (error) {
        console.error('? Error:', error.message);
        process.exit(1);
    }
}

runFlowTest();
