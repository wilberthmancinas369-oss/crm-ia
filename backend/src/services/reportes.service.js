import supabase from '../config/supabase.js';

const TAMANO_PAGINA = 500;

export const reportesService = {
  async getResumenJefe({ companyId, groupId }) {
    if (!companyId || !groupId) throw new Error('Empresa y grupo requeridos para el reporte');
    let montoCentavos = 0;
    let totalOportunidades = 0;
    const distribucionEtapas = Object.create(null);

    // Pagina para no limitar los totales a la primera respuesta de Supabase.
    for (let inicio = 0; ; inicio += TAMANO_PAGINA) {
      const { data, error } = await supabase
        .from('oportunidades')
        .select('id, valor_estimado, etapa')
        .eq('company_id', companyId)
        .eq('group_id', groupId)
        .order('id', { ascending: true })
        .range(inicio, inicio + TAMANO_PAGINA - 1);
      if (error) throw error;
      for (const oportunidad of data) {
        montoCentavos += Math.round(Number(oportunidad.valor_estimado ?? 0) * 100);
        totalOportunidades++;
        const etapa = oportunidad.etapa || 'Sin etapa';
        distribucionEtapas[etapa] = (distribucionEtapas[etapa] ?? 0) + 1;
      }
      if (data.length < TAMANO_PAGINA) break;
    }
    return {
      grupo_id: groupId,
      ventas: { montoTotal: montoCentavos / 100, totalOportunidades, distribucionEtapas },
      // HU6 aún no define el modelo de tareas en este repositorio. No inventar su contrato
      // ni confundir información no disponible con cero tareas pendientes.
      productividad: null,
      productividadDisponible: false
    };
  }
};
