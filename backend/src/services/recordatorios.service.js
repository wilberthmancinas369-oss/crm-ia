import supabase from '../config/supabase.js';
import { emailService } from './email.service.js';

export const recordatoriosService = {
  async enviarPendientes(ahora = new Date()) {
    const hasta = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const { data: tareas, error } = await supabase.from('tareas')
      .select('id, company_id, titulo, fecha_limite, responsable_id, profiles!inner(email)')
      .is('recordatorio_enviado_at', null).neq('estado', 'Completada')
      .gt('fecha_limite', ahora.toISOString()).lte('fecha_limite', hasta.toISOString())
      .order('fecha_limite');
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
