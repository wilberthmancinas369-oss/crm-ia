import supabase from '../config/supabase.js';
import { permisosDelNivel } from '../config/permisos.js';

export const perfilService = {
  /**
   * Perfil del usuario con su empresa, grupos, rol más alto y permisos.
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

    // El nivel efectivo es el rol más alto en cualquiera de sus grupos.
    // PostgREST no ordena las filas padre por una columna embebida, así que se calcula aquí.
    const rolMasAlto = asignaciones.reduce(
      (max, a) => (!max || a.roles.level > max.level ? a.roles : max),
      null
    );
    const nivel = rolMasAlto ? rolMasAlto.level : null;

    return {
      usuario: { id: perfil.id, nombre: perfil.full_name, email: perfil.email },
      empresa: { id: perfil.companies.id, nombre: perfil.companies.name },
      rol: rolMasAlto ? { nombre: rolMasAlto.name, nivel } : null,
      grupos: asignaciones.map((a) => ({ id: a.groups.id, nombre: a.groups.name, rol: a.roles.name })),
      permisos: nivel === null ? {} : permisosDelNivel(nivel)
    };
  }
};
