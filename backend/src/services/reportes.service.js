import supabase from '../config/supabase.js';

const TAMANO_PAGINA = 500;

export const reportesService = {
  async getResumenJefe({ companyId, groupId }, ahora = new Date()) {
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
    const productividad = Object.create(null);
    let productividadDisponible = true;
    try {
      // HU6 asigna exactamente un vínculo: contacto u oportunidad. El grupo se hereda
      // de ese vínculo, no del responsable ni de una columna en tareas.
      for (const vinculo of ['contactos', 'oportunidades']) {
        for (let inicio = 0; ; inicio += TAMANO_PAGINA) {
          const { data, error } = await supabase.from('tareas')
            .select(`id, responsable_id, estado, fecha_limite, profiles!inner(id, full_name, company_id), ${vinculo}!inner(group_id, company_id)`)
            .eq('company_id', companyId)
            .eq(`${vinculo}.company_id`, companyId)
            .eq(`${vinculo}.group_id`, groupId)
            .eq('profiles.company_id', companyId)
            .in('estado', ['Pendiente', 'En progreso'])
            .order('id', { ascending: true })
            .range(inicio, inicio + TAMANO_PAGINA - 1);
          if (error) throw error;
          for (const tarea of data) {
            const fechaLimite = Date.parse(tarea.fecha_limite);
            if (!Number.isFinite(fechaLimite)) throw new Error('Fecha límite de tarea inválida');
            const agente = productividad[tarea.responsable_id] ??= {
              nombre: tarea.profiles.full_name || 'Sin nombre', pendientes: 0, vencidas: 0
            };
            // Pendientes incluye En progreso; vencidas es un subconjunto de pendientes.
            agente.pendientes++;
            if (fechaLimite < ahora.getTime()) agente.vencidas++;
          }
          if (data.length < TAMANO_PAGINA) break;
        }
      }
    } catch (error) {
      // Permite consultar ventas si aún falta aplicar la migración de HU6.
      // Otros errores deben producir fallo, nunca aparentar cero tareas.
      if (['42P01', 'PGRST205'].includes(error.code)) productividadDisponible = false;
      else throw error;
    }
    return {
      grupo_id: groupId,
      ventas: { montoTotal: montoCentavos / 100, totalOportunidades, distribucionEtapas },
      productividad: productividadDisponible ? productividad : null,
      productividadDisponible
    };
  }
};
