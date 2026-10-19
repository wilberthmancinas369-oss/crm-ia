import supabase from '../config/supabase.js';

export const reportesService = {
  // HU-8: Reporte general de la empresa (comparativa por grupo)
  async getReporteGeneralEmpresa(companyId) {
    const { data: grupos, error: errGrupos } = await supabase
      .from('groups')
      .select('id, name')
      .eq('company_id', companyId);

    if (grupos.length === 0) {
      return { empresa_id: companyId, totalGrupos: 0, grupos: [] };
    }
    const idsGrupos = grupos.map((g) => g.id);

    const { data: oportunidades, error: errOp } = await supabase
      .from('oportunidades')
      .select('valor_estimado, group_id')
      .eq('company_id', companyId);

    if (errOp) throw errOp;

    const { data: contactos, error: errCont } = await supabase
      .from('contactos')
      .select('group_id')
      .in('group_id', idsGrupos);

    if (errCont) throw errCont;

    const { data: miembros, error: errMiem } = await supabase
      .from('user_group_role')
      .select('group_id')
      .in('group_id', idsGrupos);

    if (errMiem) throw errMiem;

    const comparativaGrupos = grupos.map((g) => {
      const opsGrupo = oportunidades.filter((o) => o.group_id === g.id);
      const montoTotal = opsGrupo.reduce((acc, o) => acc + parseFloat(o.valor_estimado || 0), 0);

      return {
        grupo_id: g.id,
        nombre: g.name,
        montoTotal,
        totalOportunidades: opsGrupo.length,
        ticketPromedio: opsGrupo.length ? montoTotal / opsGrupo.length : 0,
        totalContactos: contactos.filter((c) => c.group_id === g.id).length,
        totalMiembros: miembros.filter((m) => m.group_id === g.id).length
      };
    });

    return {
      empresa_id: companyId,
      totalGrupos: grupos.length,
      grupos: comparativaGrupos
    };
  },

  // HU-5: Resumen ejecutivo para el Jefe de Área
  async getResumenJefe(companyId) {
    const { data: oportunidades, error: errOp } = await supabase
      .from('oportunidades')
      .select('valor_estimado, etapa')
      .eq('company_id', companyId);

    if (errOp) throw errOp;

    let montoTotal = 0;
    const distribucionEtapas = {};

    oportunidades.forEach((op) => {
      montoTotal += parseFloat(op.valor_estimado || 0);
      const etapa = op.etapa || 'Sin Etapa';
      distribucionEtapas[etapa] = (distribucionEtapas[etapa] || 0) + 1;
    });

    const { data: tareas, error: errTars } = await supabase
      .from('tareas')
      .select('*')
      .eq('company_id', companyId)
      .neq('estado', 'Completada');

    if (errTars) throw errTars;

    const ahora = new Date().toISOString();
    const productividadAgentes = {};

    tareas.forEach((t) => {
      const userId = t.usuario_id;
      if (!productividadAgentes[userId]) {
        productividadAgentes[userId] = { pendientes: 0, vencidas: 0 };
      }
      productividadAgentes[userId].pendientes++;
      if (t.fecha_limite && t.fecha_limite < ahora) {
        productividadAgentes[userId].vencidas++;
      }
    });

    return {
      ventas: { montoTotal, distribucionEtapas },
      productividad: productividadAgentes
    };
  }
};