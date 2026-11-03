import { obtenerCandidatas, prioridadesService, validarPrioridades } from '../services/ia/prioridades.js';
import { crearLimitador } from '../services/ia/servicio.js';
import { ErrorIA } from '../services/ia/errores.js';
import { ambitoDe } from '../services/alcance.service.js';

export function crearControladorPrioridades({ obtener = obtenerCandidatas, proveedor = prioridadesService, limitar = crearLimitador({ maximo: 3 }) } = {}) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      limitar(`${req.company_id}:${req.user.id}`);
      const { candidatas, parcial } = await obtener(ambitoDe(req));
      if (!candidatas.length) return res.json({ prioridades: [], analizadas: 0, parcial });
      const contextos = candidatas.map((c, i) => ({ ...c.contexto, referencia: `O${i + 1}` }));
      const resultado = validarPrioridades(await proveedor.generar(contextos), contextos.map(c => c.referencia));
      res.json({ analizadas: candidatas.length, parcial, prioridades: resultado.prioridades.map(p => {
        const c = candidatas[contextos.findIndex(x => x.referencia === p.referencia)];
        return { id: c.id, nombre: c.nombre, motivo: p.motivo };
      }) });
    } catch (error) {
      if (error instanceof ErrorIA) {
        if (error.retryAfter) res.set('Retry-After', String(error.retryAfter));
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      res.status(500).json({ error: 'No se pudieron preparar las prioridades.' });
    }
  };
}
export const priorizarOportunidades = crearControladorPrioridades();
