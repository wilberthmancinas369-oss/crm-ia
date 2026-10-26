// Niveles de rol (columna roles.level). Cada rol hereda los permisos del anterior.
// Matriz completa y reglas: docs/HU11-matriz-permisos.md
export const NIVELES = {
  AGENTE: 0,
  JEFE_AREA: 1,
  ADMINISTRADOR: 2
};

// Alcance de cada permiso:
// - 'grupo': se tiene en los grupos donde el usuario alcanza `nivel` (el Administrador, en todos).
// - 'empresa': solo el Administrador, que actúa sobre toda la empresa.
// Única fuente de verdad: la usan las rutas (middleware autorizar) y GET /api/auth/me para el menú.
export const PERMISOS = {
  gestionarCRM:          { nivel: NIVELES.AGENTE,        alcance: 'grupo' },   // contactos, oportunidades, interacciones
  verGrupos:             { nivel: NIVELES.AGENTE,        alcance: 'grupo' },
  verMiembros:           { nivel: NIVELES.JEFE_AREA,     alcance: 'grupo' },
  invitarUsuarios:       { nivel: NIVELES.JEFE_AREA,     alcance: 'grupo' },
  gestionarInvitaciones: { nivel: NIVELES.JEFE_AREA,     alcance: 'grupo' },   // reenviar/cancelar (HU-9)
  gestionarMiembros:     { nivel: NIVELES.JEFE_AREA,     alcance: 'grupo' },   // cambiar rol y mover de grupo (HU-9)
  verReporteGrupo:       { nivel: NIVELES.JEFE_AREA,     alcance: 'grupo' },
  asignarResponsable:    { nivel: NIVELES.JEFE_AREA,     alcance: 'grupo' },   // responsable y colaboradores de oportunidades ajenas (HU 4.1)
  crearGrupos:           { nivel: NIVELES.ADMINISTRADOR, alcance: 'empresa' },
  eliminarGrupos:        { nivel: NIVELES.ADMINISTRADOR, alcance: 'empresa' },
  verReporteGeneral:     { nivel: NIVELES.ADMINISTRADOR, alcance: 'empresa' },
  administrarUsuarios:   { nivel: NIVELES.ADMINISTRADOR, alcance: 'empresa' },
  renombrarGrupos:       { nivel: NIVELES.ADMINISTRADOR, alcance: 'empresa' },   // HU-14
  eliminarGrupos:        { nivel: NIVELES.ADMINISTRADOR, alcance: 'empresa' },
};

const definicion = (permiso) => {
  const def = PERMISOS[permiso];
  if (!def) throw new Error(`Permiso desconocido: ${permiso}`);
  return def;
};

// perfil.grupos: [{ id, nivel }] — rol del usuario en cada uno de sus grupos
export const esAdministrador = (perfil) =>
  perfil.grupos.some((g) => g.nivel >= NIVELES.ADMINISTRADOR);

const nivelEnGrupo = (perfil, grupoId) =>
  perfil.grupos.find((g) => g.id === grupoId)?.nivel ?? null;

/**
 * Grupos donde el usuario tiene el permiso.
 * Devuelve null si lo tiene en toda la empresa (Administrador), o un arreglo de ids (puede estar vacío).
 */
export const gruposConPermiso = (perfil, permiso) => {
  const { nivel, alcance } = definicion(permiso);
  if (esAdministrador(perfil)) return null;
  if (alcance === 'empresa') return [];
  return perfil.grupos.filter((g) => g.nivel >= nivel).map((g) => g.id);
};

// ¿Tiene el permiso en al menos un grupo (o en toda la empresa)?
export const tienePermiso = (perfil, permiso) => {
  const grupos = gruposConPermiso(perfil, permiso);
  return grupos === null || grupos.length > 0;
};

// ¿Tiene el permiso en este grupo concreto?
export const puedeEnGrupo = (perfil, permiso, grupoId) => {
  const grupos = gruposConPermiso(perfil, permiso);
  return grupos === null || grupos.includes(grupoId);
};

/**
 * Nivel de rol más alto que el usuario puede asignar en un grupo (al invitar o cambiar un rol).
 * Administrador: hasta Jefe de Área (el rol Administrador nunca se asigna así).
 * Jefe de Área en ese grupo: solo Agente. Cualquier otro caso: null (no puede asignar).
 */
export const rolMaximoAsignable = (perfil, grupoId) => {
  if (esAdministrador(perfil)) return NIVELES.JEFE_AREA;
  return nivelEnGrupo(perfil, grupoId) >= NIVELES.JEFE_AREA ? NIVELES.AGENTE : null;
};

/**
 * ¿Puede el usuario cambiar el rol de un miembro o moverlo a otro grupo? (para los endpoints de HU-9)
 * - Nadie se modifica a sí mismo por esta vía.
 * - Administrador: a cualquiera, siempre que el nivel nuevo sea asignable.
 * - Jefe de Área: solo Agentes de su grupo, y solo hacia Agente (no escala privilegios).
 * @param {object} miembro { id, nivel } rol actual del miembro en ese grupo
 * @param {number|null} nivelNuevo nivel al que se quiere cambiar, o null si se le mueve de grupo con su rol
 */
export const puedeGestionarMiembro = (perfil, grupoId, miembro, nivelNuevo = null) => {
  if (miembro.id === perfil.usuario.id) return false;
  if (!puedeEnGrupo(perfil, 'gestionarMiembros', grupoId)) return false;
  if (esAdministrador(perfil)) return nivelNuevo === null || nivelNuevo <= rolMaximoAsignable(perfil, grupoId);
  if (miembro.nivel >= NIVELES.JEFE_AREA) return false;
  return nivelNuevo === null || nivelNuevo <= rolMaximoAsignable(perfil, grupoId);
};

// { gestionarCRM: true, crearGrupos: false, ... } para el menú del frontend
export const resumenPermisos = (perfil) =>
  Object.fromEntries(Object.keys(PERMISOS).map((permiso) => [permiso, tienePermiso(perfil, permiso)]));

// { invitarUsuarios: ['g1'], crearGrupos: [], gestionarCRM: null, ... } — null = toda la empresa.
// El frontend lo usa para ofrecer solo los grupos permitidos en cada formulario.
export const alcancesPorPermiso = (perfil) =>
  Object.fromEntries(Object.keys(PERMISOS).map((permiso) => [permiso, gruposConPermiso(perfil, permiso)]));
