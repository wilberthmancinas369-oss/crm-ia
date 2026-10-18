// Catálogos del CRM (HU 4.1). Deben coincidir con backend/src/config/crm.js.

// Etapas del pipeline de ventas, en orden; las dos últimas cierran la oportunidad
export const ETAPAS = [
  { valor: 'Primer contacto', clase: 'bg-sky-100 text-sky-800', columna: 'bg-sky-50' },
  { valor: 'Propuesta', clase: 'bg-indigo-100 text-indigo-800', columna: 'bg-indigo-50' },
  { valor: 'Negociación', clase: 'bg-amber-100 text-amber-800', columna: 'bg-amber-50' },
  { valor: 'Ganada', clase: 'bg-emerald-100 text-emerald-800', columna: 'bg-emerald-50' },
  { valor: 'Perdida', clase: 'bg-red-100 text-red-700', columna: 'bg-red-50' }
]
export const ETAPA_INICIAL = ETAPAS[0].valor
export const claseEtapa = (etapa) => ETAPAS.find((e) => e.valor === etapa)?.clase ?? 'bg-gray-100 text-gray-700'

// Redes sociales de un contacto (contactos.redes_sociales)
export const REDES_SOCIALES = [
  { clave: 'linkedin', etiqueta: 'LinkedIn' },
  { clave: 'facebook', etiqueta: 'Facebook' },
  { clave: 'instagram', etiqueta: 'Instagram' },
  { clave: 'x', etiqueta: 'X (Twitter)' },
  { clave: 'sitio_web', etiqueta: 'Sitio web' }
]

export const formatoMonto = (valor) =>
  valor === null || valor === undefined || valor === ''
    ? '—'
    : Number(valor).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

export const formatoFecha = (iso) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
