import { reportesService } from '../services/reportes.service.js';
import { resolverGrupoDestino } from '../services/alcance.service.js';

export const getReporteJefe = async (req, res) => {
  try {
    // El alcance proviene de autorizar; la empresa nunca se recibe del cliente.
    const destino = await resolverGrupoDestino({
      company_id: req.company_id,
      perfil: req.perfil,
      alcance: req.alcance
    }, req.query.grupo_id);
    if (destino.error) return res.status(destino.status).json({ error: destino.error });
    const resumen = await reportesService.getResumenJefe({
      companyId: req.company_id, groupId: destino.grupoId
    });
    return res.json(resumen);
  } catch (error) {
    console.error('Error al generar reporte de grupo:', error);
    return res.status(500).json({ error: 'No se pudo generar el reporte del grupo' });
  }
};

// HU-8: la empresa sale del perfil (middleware autorizar), nunca del cliente
export const getReporteGeneral = async (req, res) => {
  try {
    return res.json(await reportesService.getReporteGeneralEmpresa(req.company_id));
  } catch (error) {
    console.error('Error al generar reporte general:', error);
    return res.status(500).json({ error: 'No se pudo generar el reporte general de la empresa' });
  }
};
