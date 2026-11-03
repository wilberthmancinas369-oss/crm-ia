// Catálogos del CRM compartidos por rutas, controladores y migraciones (HU 4.1).
// Si cambian, actualizar también frontend/src/constants/crm.js y la migración de la base.

// Etapas del pipeline de ventas, en orden. Las dos últimas cierran la oportunidad.
export const ETAPAS = ['Primer contacto', 'Propuesta', 'Negociación', 'Ganada', 'Perdida'];
export const ETAPA_INICIAL = ETAPAS[0];

export const ESTADOS_CONTACTO = ['Activo', 'Inactivo'];

// Redes sociales que se guardan en contactos.redes_sociales (JSONB), como URL
export const REDES_SOCIALES = ['linkedin', 'facebook', 'instagram', 'x', 'sitio_web'];
