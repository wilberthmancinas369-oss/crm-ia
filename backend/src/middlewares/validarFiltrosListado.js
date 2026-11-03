import validator from 'validator';
import { ETAPAS, ESTADOS_CONTACTO } from '../config/crm.js';

// Solo estos parámetros llegan al servicio; empresa y grupos siempre salen de la sesión.
const camposPorLista = {
  contactos: ['nombre', 'empresa', 'estado'],
  oportunidades: ['q', 'etapa', 'responsable_id', 'monto_min', 'monto_max'],
  tareas: ['q', 'estado', 'vencimiento', 'responsable_id']
};

export const validarFiltrosListado = (lista) => (req, res, next) => {
  const filtros = {};
  const rechazar = (error) => res.status(400).json({ error });
  for (const campo of camposPorLista[lista]) {
    const valor = req.query[campo];
    if (valor === undefined) continue;
    if (typeof valor !== 'string') return rechazar(`El filtro ${campo} debe tener un solo valor de texto`);
    if (valor.trim()) filtros[campo] = valor.trim();
  }

  const estados = lista === 'contactos' ? ESTADOS_CONTACTO : ['Pendiente', 'En progreso', 'Completada'];
  if (filtros.estado && !estados.includes(filtros.estado)) return rechazar('Estado no válido');
  if (filtros.etapa && !ETAPAS.includes(filtros.etapa)) return rechazar('Etapa no válida');
  if (filtros.vencimiento && !['vencidas', 'proximas_24h', 'sin_vencer'].includes(filtros.vencimiento)) {
    return rechazar('Vencimiento no válido');
  }
  const responsable = filtros.responsable_id;
  if (responsable && !(lista === 'tareas' && responsable === 'todos') && !validator.isUUID(responsable)) {
    return rechazar('El responsable_id debe ser un UUID válido');
  }

  for (const campo of ['monto_min', 'monto_max']) {
    if (filtros[campo] === undefined) continue;
    if (!/^\d+(\.\d{1,2})?$/.test(filtros[campo]) || Number(filtros[campo]) > 9999999999.99) {
      return rechazar(`${campo} debe ser un monto no negativo con hasta dos decimales`);
    }
    filtros[campo] = Number(filtros[campo]);
  }
  if (filtros.monto_min !== undefined && filtros.monto_max !== undefined && filtros.monto_min > filtros.monto_max) {
    return rechazar('El monto mínimo no puede ser mayor que el máximo');
  }
  req.filtros = filtros;
  next();
};
