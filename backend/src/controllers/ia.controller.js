import { obtenerContexto } from '../services/ia/contexto.js';
import { iaService, crearLimitador } from '../services/ia/servicio.js';
import { ErrorIA } from '../services/ia/errores.js';
import { ambitoDe } from '../services/alcance.service.js';

export function crearControladorIA({ contexto = obtenerContexto, proveedor = iaService, limitar = crearLimitador() } = {}) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      limitar(`${req.company_id}:${req.user.id}`);
      const datos = await contexto(req.params.id, ambitoDe(req));
      if (!datos) return res.status(404).json({ error: 'Oportunidad no encontrada' });
      return res.json(await proveedor.generar(datos));
    } catch (error) {
      if (error instanceof ErrorIA) {
        if (error.retryAfter) res.set('Retry-After', String(error.retryAfter));
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      return res.status(500).json({ error: 'No se pudo preparar la sugerencia de IA.' });
    }
  };
}
export const sugerirOportunidad = crearControladorIA();
