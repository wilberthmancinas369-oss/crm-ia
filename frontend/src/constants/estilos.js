import { ETAPAS } from './crm'

// Etapas que cierran la venta; el resto son etapas abiertas
const CERRADAS = ['Ganada', 'Perdida']

// Clase de tono (definida en styles/components.css) para pintar una etapa:
// Ganada en verde, Perdida en rojo y las abiertas con los tres colores de la marca, en orden.
export const tonoEtapa = (etapa) => {
  if (etapa === 'Ganada') return 'tono-ganada'
  if (etapa === 'Perdida') return 'tono-perdida'
  const abiertas = ETAPAS.filter((e) => !CERRADAS.includes(e.valor))
  const posicion = abiertas.findIndex((e) => e.valor === etapa)
  return `tono-abierta-${Math.max(posicion, 0) % 3}`
}

// Insignia de cada tipo de interacción
export const claseTipoInteraccion = (tipo) =>
  tipo === 'Llamada' ? 'badge badge-info'
    : tipo === 'Correo' ? 'badge badge-aviso'
    : tipo === 'Reunión' ? 'badge badge-laguna'
    : 'badge'