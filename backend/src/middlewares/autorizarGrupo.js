/**
 * Exige que el grupo indicado en la URL (req.params[param]) esté dentro del alcance del permiso
 * que validó `autorizar`. Debe ir después de `autorizar(permiso)`.
 * El Administrador (req.alcance === null) pasa; los controladores verifican además que el grupo
 * sea de su empresa.
 */
export const autorizarGrupo = (param = 'id') => (req, res, next) => {
  if (req.alcance === null || req.alcance.includes(req.params[param])) return next();
  return res.status(403).json({ error: 'No tienes permisos sobre este grupo' });
};
