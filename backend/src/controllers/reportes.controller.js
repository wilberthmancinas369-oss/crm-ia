import { reportesService } from '../services/reportes.service.js';

// HU-5: Creado por tu compañero para el Jefe de Área
export const getReporteJefe = async (req, res) => {
  try {
    const { empresa_id } = req.query;
    
    if (!empresa_id) {
      return res.status(400).json({ error: 'El empresa_id es obligatorio para generar el reporte' });
    }

    const resumen = await reportesService.getResumenJefe(empresa_id);
    res.json(resumen);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// HU-8: Tu controlador para el Reporte General de la Empresa
export const getReporteGeneral = async (req, res) => {
  try {
    const reporte = await reportesService.getReporteGeneralEmpresa(req.company_id);
    res.json(reporte);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};