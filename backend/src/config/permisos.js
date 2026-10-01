// Niveles de rol (columna roles.level). Cada rol hereda los permisos del anterior.
export const NIVELES = {
  AGENTE: 0,
  JEFE_AREA: 1,
  ADMINISTRADOR: 2
};

// Nivel mínimo para cada permiso. Única fuente de verdad: la usan las rutas (autorizarRol)
// y GET /api/auth/me, que se la pasa al frontend para armar el menú.
export const PERMISOS = {
  gestionarCRM: NIVELES.AGENTE,          // contactos, oportunidades e interacciones
  verGrupos: NIVELES.AGENTE,             // listar los grupos de la empresa
  invitarUsuarios: NIVELES.JEFE_AREA,
  crearGrupos: NIVELES.JEFE_AREA         // HU-2: "Administrador de Empresa o Jefe de Área"
};

// { gestionarCRM: true, invitarUsuarios: false, ... } para un nivel dado
export const permisosDelNivel = (nivel) =>
  Object.fromEntries(Object.entries(PERMISOS).map(([permiso, minimo]) => [permiso, nivel >= minimo]));
