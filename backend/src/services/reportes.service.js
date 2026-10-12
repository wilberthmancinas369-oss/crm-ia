import supabase from '../config/supabase.js';

export const reportesService = {
  // Obtener el resumen ejecutivo para el Jefe de Área
  async getResumenJefe(empresaId) {
    // 1. Obtener Monto Total de Oportunidades
    const { data: oportunidades, error: errOp } = await supabase
      .from('oportunidades')
      .select('valor, etapa')
      .eq('empresa_id', empresaId);

    if (errOp) throw errOp;

    // Calcular monto total y distribución por etapa en memoria
    let montoTotal = 0;
    const distribucionEtapas = {};

    oportunidades.forEach(op => {
      montoTotal += parseFloat(op.valor || 0);
      const etapa = op.etapa || 'Sin Etapa';
      distribucionEtapas[etapa] = (distribucionEtapas[etapa] || 0) + 1;
    });

    // 2. Obtener Tareas Pendientes y Vencidas por Agente
    const { data: tareas, error: errTars } = await supabase
      .from('tareas')
      .select('usuario_id, estado, fecha_limite')
      .eq('empresa_id', empresaId)
      .neq('estado', 'Completada');

    if (errTars) throw errTars;

    const ahora = new Date().toISOString();
    const productividadAgentes = {};

    tareas.forEach(t => {
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
      // Resumen de Ventas
      ventas: {
        montoTotal,
        distribucionEtapas
      },
      // Resumen de Productividad
      productividad: productividadAgentes
    };
  }
};

module.exports = reportesService;
