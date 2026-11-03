import supabase from '../config/supabase.js';
import { emailService } from './email.service.js';

export const recordatoriosService = {
  // Con tareaId solo revisa esa tarea (al reasignarla o reprogramarla, HU-13).
  async enviarPendientes(ahora = new Date(), { tareaId } = {}) {
    const hasta = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    let consulta = supabase.from('tareas')
      .select('id, company_id, titulo, fecha_limite, responsable_id, profiles!inner(email)')
      .is('recordatorio_enviado_at', null).neq('estado', 'Completada')
      .gt('fecha_limite', ahora.toISOString()).lte('fecha_limite', hasta.toISOString());
    if (tareaId) consulta = consulta.eq('id', tareaId);
    const { data: tareas, error } = await consulta.order('fecha_limite');
    if (error) throw error;

    for (const tarea of tareas) {
      try {
        const resultado = await emailService.sendTaskReminder(tarea.profiles.email, tarea.titulo, tarea.fecha_limite);
        if (!resultado.success) throw new Error(resultado.error);
        // Solo se marca tras la aceptación de Brevo. Si cambió la fecha o el responsable,
        // no se marca la nueva asignación como notificada.
        const { error: errorMarca } = await supabase.from('tareas')
          .update({ recordatorio_enviado_at: ahora.toISOString() })
          .eq('id', tarea.id).eq('company_id', tarea.company_id)
          .eq('fecha_limite', tarea.fecha_limite).eq('responsable_id', tarea.responsable_id);
        if (errorMarca) throw errorMarca;
      } catch (error) {
        console.error(`Error en recordatorio de tarea ${tarea.id}:`, error.message);
      }
    }
  }
};

const recordatoriosActivos = () => process.env.RECORDATORIOS_ACTIVOS === 'true'
  && Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);

/**
 * HU-13: al reasignar (o reprogramar) una tarea que ya vence en menos de 24 h, el recordatorio
 * se manda en ese momento al nuevo responsable, sin esperar la siguiente revisión de 15 min.
 * Si falla, solo se registra: la revisión periódica lo vuelve a intentar.
 */
export async function avisarSiVencePronto(tareaId, ahora = new Date()) {
  if (!recordatoriosActivos()) return;
  try {
    await recordatoriosService.enviarPendientes(ahora, { tareaId });
  } catch (error) {
    console.error(`Error al avisar la tarea ${tareaId}:`, error.message);
  }
}

// Una sola instancia del backend ejecuta esta revisión. Sin colas ni servicios nuevos.
export function iniciarRecordatorios() {
  if (process.env.RECORDATORIOS_ACTIVOS !== 'true') return;
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
    console.error('Recordatorios desactivados: faltan BREVO_API_KEY o BREVO_SENDER_EMAIL');
    return;
  }
  let ejecutando = false;
  const revisar = async () => {
    if (ejecutando) return;
    ejecutando = true;
    try {
      await recordatoriosService.enviarPendientes();
    } catch (error) {
      console.error('Error al revisar recordatorios:', error.message);
    } finally {
      ejecutando = false;
    }
  };
  void revisar();
  const intervalo = setInterval(revisar, 15 * 60 * 1000);
  intervalo.unref();
  return () => clearInterval(intervalo);
}
