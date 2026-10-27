import supabase from '../../config/supabase.js';
import { filtrarPorGrupos } from '../alcance.service.js';
import { ETAPAS } from '../../config/crm.js';

const TIPOS = new Set(['Llamada', 'Correo', 'Reunión', 'Nota']);
const ESTADOS = new Set(['Pendiente', 'En progreso', 'Completada']);

// Lista explícita de campos; nunca se consultan nombres, detalles, títulos ni credenciales.
export async function obtenerContexto(id, { companyId, alcance }, ahora = new Date()) {
  const { data: oportunidad, error } = await filtrarPorGrupos(
    supabase.from('oportunidades').select('id, group_id, etapa, valor_estimado')
      .eq('id', id).eq('company_id', companyId), alcance
  ).maybeSingle();
  if (error) throw error;
  if (!oportunidad) return null;

  // Solo registros de ESTA oportunidad; no se incorporan otras ventas del mismo contacto.
  const respuestas = await Promise.all([
    supabase.from('interacciones').select('tipo, created_at, contactos!inner(group_id, company_id)')
      .eq('company_id', companyId).eq('oportunidad_id', id)
      .eq('contactos.company_id', companyId).eq('contactos.group_id', oportunidad.group_id)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50),
    supabase.from('tareas').select('estado, fecha_limite')
      .eq('company_id', companyId).eq('oportunidad_id', id)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50)
  ]);
  for (const respuesta of respuestas) if (respuesta.error) throw respuesta.error;
  const monto = oportunidad.valor_estimado === null ? null : Number(oportunidad.valor_estimado);
  return {
    etapa: ETAPAS.includes(oportunidad.etapa) ? oportunidad.etapa : 'No especificada',
    monto_estimado: Number.isFinite(monto) && monto >= 0 ? monto : null,
    alcance_resumen: 'Hasta las 50 interacciones y 50 tareas más recientes vinculadas directamente a esta oportunidad. Sin textos libres.',
    interacciones: respuestas[0].data.map(i => ({
      tipo: TIPOS.has(i.tipo) ? i.tipo : 'Otro',
      dias_desde_interaccion: Number.isFinite(Date.parse(i.created_at)) ? Math.max(0, Math.floor((ahora - new Date(i.created_at)) / 86400000)) : null
    })),
    tareas: respuestas[1].data.map(t => ({
      estado: ESTADOS.has(t.estado) ? t.estado : 'No especificado',
      vencida: t.estado !== 'Completada' && Number.isFinite(Date.parse(t.fecha_limite)) && Date.parse(t.fecha_limite) < ahora.getTime()
    }))
  };
}
