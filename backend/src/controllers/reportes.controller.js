import { reportesService } from '../services/reportes.service.js';

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

