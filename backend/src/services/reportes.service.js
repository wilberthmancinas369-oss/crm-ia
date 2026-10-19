import supabase from '../config/supabase.js';

const TAMANO_PAGINA = 500;

// Lee todas las filas de una consulta en páginas, para no limitar los totales a la primera respuesta.
// `orden`: columnas que identifican cada fila, para que la paginación sea estable.
async function leerTodo(crearConsulta, orden = ['id']) {
  const filas = [];
  for (let inicio = 0; ; inicio += TAMANO_PAGINA) {
    const consulta = orden.reduce((c, columna) => c.order(columna, { ascending: true }), crearConsulta());
    const { data, error } = await consulta.range(inicio, inicio + TAMANO_PAGINA - 1);
    if (error) throw error;
    filas.push(...data);
    if (data.length < TAMANO_PAGINA) return filas;
  }
}

export const reportesService = {
  // HU-8: comparativa de todos los grupos de la empresa (solo Administrador)
  async getReporteGeneralEmpresa(companyId) {
    if (!companyId) throw new Error('Empresa requerida para el reporte');
    const { data: grupos, error } = await supabase.from('groups')
      .select('id, name').eq('company_id', companyId).order('name');
    if (error) throw error;

    const [oportunidades, contactos, miembros] = await Promise.all([
      leerTodo(() => supabase.from('oportunidades').select('id, valor_estimado, etapa, group_id').eq('company_id', companyId)),
      leerTodo(() => supabase.from('contactos').select('id, group_id').eq('company_id', companyId)),
      // user_group_role no tiene id: su llave es (user_id, group_id)
      leerTodo(() => supabase.from('user_group_role').select('user_id, group_id').eq('company_id', companyId),
        ['user_id', 'group_id'])
    ]);

    const comparativa = grupos.map((grupo) => {
      const delGrupo = oportunidades.filter((o) => o.group_id === grupo.id);
      const montoCentavos = delGrupo.reduce((total, o) => total + Math.round(Number(o.valor_estimado ?? 0) * 100), 0);
      const ganadas = delGrupo.filter((o) => o.etapa === 'Ganada');
      return {
        grupo_id: grupo.id,
        nombre: grupo.name,
        totalMiembros: miembros.filter((m) => m.group_id === grupo.id).length,
        totalContactos: contactos.filter((c) => c.group_id === grupo.id).length,
        totalOportunidades: delGrupo.length,
        oportunidadesGanadas: ganadas.length,
        montoTotal: montoCentavos / 100,
        montoGanado: ganadas.reduce((total, o) => total + Math.round(Number(o.valor_estimado ?? 0) * 100), 0) / 100,
        ticketPromedio: delGrupo.length ? montoCentavos / 100 / delGrupo.length : 0
      };
    });

    const suma = (campo) => comparativa.reduce((total, g) => total + g[campo], 0);
    return {
      empresa_id: companyId,
      totalGrupos: grupos.length,
      totales: {
        totalContactos: suma('totalContactos'),
        totalOportunidades: suma('totalOportunidades'),
        oportunidadesGanadas: suma('oportunidadesGanadas'),
        montoTotal: Math.round(suma('montoTotal') * 100) / 100,
        montoGanado: Math.round(suma('montoGanado') * 100) / 100
      },
      grupos: comparativa
    };
  },

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
      if (error) {
        // No consultar toda la empresa como alternativa: perdería el aislamiento por grupo.
        if (error.code === '42703' && /column oportunidades\.group_id does not exist/.test(error.message ?? '')) {
          return { grupo_id: groupId, ventas: null, ventasDisponible: false,
            productividad: null, productividadDisponible: false };
        }
        throw error;
      }
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
      ventasDisponible: true,
      ventas: { montoTotal: montoCentavos / 100, totalOportunidades, distribucionEtapas },
      productividad: productividadDisponible ? productividad : null,
      productividadDisponible
    };
  }
};
