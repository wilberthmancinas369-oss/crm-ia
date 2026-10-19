// HU-8: reporte general de la empresa (comparativa por grupo)
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-de-prueba';
const { default: supabase } = await import('../src/config/supabase.js');
const { reportesService } = await import('../src/services/reportes.service.js');

// Columnas reales de cada tabla (migraciones). Pedir o ordenar por una que no existe falla como en
// Supabase: así se detectó que user_group_role no tiene id.
const COLUMNAS = {
  groups: ['id', 'name', 'description', 'company_id', 'created_at'],
  oportunidades: ['id', 'company_id', 'group_id', 'valor_estimado', 'etapa'],
  contactos: ['id', 'company_id', 'group_id'],
  user_group_role: ['user_id', 'group_id', 'role_id', 'company_id', 'assigned_at']
};

let tablas;
beforeEach(() => {
  tablas = {
    groups: [
      { id: 'g1', name: 'Ventas', company_id: 'c1' },
      { id: 'g2', name: 'Soporte', company_id: 'c1' },
      { id: 'gX', name: 'Ajeno', company_id: 'c2' }
    ],
    oportunidades: [
      { id: 'o1', company_id: 'c1', group_id: 'g1', valor_estimado: '100.10', etapa: 'Ganada' },
      { id: 'o2', company_id: 'c1', group_id: 'g1', valor_estimado: 200, etapa: 'Propuesta' },
      { id: 'o3', company_id: 'c1', group_id: 'g2', valor_estimado: null, etapa: 'Perdida' },
      { id: 'oX', company_id: 'c2', group_id: 'gX', valor_estimado: 999, etapa: 'Ganada' }
    ],
    contactos: [
      { id: 'k1', company_id: 'c1', group_id: 'g1' },
      { id: 'k2', company_id: 'c1', group_id: 'g2' },
      { id: 'kX', company_id: 'c2', group_id: 'gX' }
    ],
    user_group_role: [
      { user_id: 'u1', group_id: 'g1', role_id: 'r', company_id: 'c1' },
      { user_id: 'u2', group_id: 'g1', role_id: 'r', company_id: 'c1' },
      { user_id: 'u2', group_id: 'g2', role_id: 'r', company_id: 'c1' },
      { user_id: 'uX', group_id: 'gX', role_id: 'r', company_id: 'c2' }
    ]
  };

  supabase.from = (tabla) => {
    const existe = (columna) => {
      if (!COLUMNAS[tabla].includes(columna)) {
        throw new Error(`column ${tabla}.${columna} does not exist`);
      }
    };
    const filtros = [];
    let columnas = [];
    const consulta = {
      select(campos) { columnas = campos.split(',').map((c) => c.trim()); columnas.forEach(existe); return consulta; },
      eq(columna, valor) { existe(columna); filtros.push((f) => f[columna] === valor); return consulta; },
      order(columna) { existe(columna); return consulta; },
      async range(inicio, fin) {
        const data = tablas[tabla].filter((f) => filtros.every((p) => p(f))).slice(inicio, fin + 1)
          .map((f) => Object.fromEntries(columnas.map((c) => [c, f[c]])));
        return { data, error: null };
      },
      then(resolver, rechazar) {
        return Promise.resolve({ data: tablas[tabla].filter((f) => filtros.every((p) => p(f))), error: null })
          .then(resolver, rechazar);
      }
    };
    return consulta;
  };
});

test('compara los grupos de la empresa sin mezclar otra empresa', async () => {
  const reporte = await reportesService.getReporteGeneralEmpresa('c1');
  assert.equal(reporte.totalGrupos, 2);
  const ventas = reporte.grupos.find((g) => g.nombre === 'Ventas');
  const soporte = reporte.grupos.find((g) => g.nombre === 'Soporte');
  assert.deepEqual(
    { nombre: ventas.nombre, miembros: ventas.totalMiembros, contactos: ventas.totalContactos,
      oportunidades: ventas.totalOportunidades, ganadas: ventas.oportunidadesGanadas,
      monto: ventas.montoTotal, ganado: ventas.montoGanado, ticket: ventas.ticketPromedio },
    { nombre: 'Ventas', miembros: 2, contactos: 1, oportunidades: 2, ganadas: 1, monto: 300.1, ganado: 100.1, ticket: 150.05 }
  );
  assert.equal(soporte.totalMiembros, 1);
  assert.equal(soporte.montoTotal, 0);
  assert.equal(soporte.ticketPromedio, 0);
  assert.deepEqual(reporte.totales,
    { totalContactos: 2, totalOportunidades: 3, oportunidadesGanadas: 1, montoTotal: 300.1, montoGanado: 100.1 });
});

test('una empresa sin grupos devuelve totales en cero', async () => {
  const reporte = await reportesService.getReporteGeneralEmpresa('c-vacia');
  assert.equal(reporte.totalGrupos, 0);
  assert.deepEqual(reporte.grupos, []);
  assert.equal(reporte.totales.totalOportunidades, 0);
});
