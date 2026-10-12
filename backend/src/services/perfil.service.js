import supabase from '../config/supabase.js';
import { alcancesPorPermiso, resumenPermisos } from '../config/permisos.js';

export const perfilService = {
  /**
   * Perfil del usuario con su empresa, su rol en cada grupo, su rol más alto y sus permisos.
   * Devuelve null si el usuario no tiene perfil (no pertenece a ninguna empresa).
   */
  async obtener(userId) {
    const { data: perfil, error: perfilError } = await supabase
      .from('profiles')
      .select('id, full_name, email, company_id, companies(id, name)')
      .eq('id', userId)
      .maybeSingle();

    if (perfilError) throw perfilError;
    if (!perfil) return null;

    const { data: asignaciones, error: asignacionesError } = await supabase
      .from('user_group_role')
      .select('groups(id, name), roles(name, level)')
      .eq('user_id', userId)
      .eq('company_id', perfil.company_id);

    if (asignacionesError) throw asignacionesError;

    // El rol es por grupo (docs/HU11-matriz-permisos.md); los permisos se evalúan grupo por grupo
    const grupos = asignaciones.map((a) => ({
      id: a.groups.id,
      nombre: a.groups.name,
      rol: a.roles.name,
      nivel: a.roles.level
    }));

    // El rol más alto solo se usa para mostrarlo en la cabecera
    const rolMasAlto = grupos.reduce((max, g) => (!max || g.nivel > max.nivel ? g : max), null);

    const resultado = {
      usuario: { id: perfil.id, nombre: perfil.full_name, email: perfil.email },
      empresa: { id: perfil.companies.id, nombre: perfil.companies.name },
      rol: rolMasAlto ? { nombre: rolMasAlto.rol, nivel: rolMasAlto.nivel } : null,
      grupos
    };
    resultado.permisos = resumenPermisos(resultado);
    resultado.alcances = alcancesPorPermiso(resultado);
    return resultado;
  }
};
