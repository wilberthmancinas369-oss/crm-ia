import crypto from 'node:crypto';

// Base de datos en memoria con la forma del cliente de Supabase que usa el backend:
// from(tabla).select/insert/update/delete + eq/in/lt/lte + order/limit + single/maybeSingle/await.
// Aplica de verdad los filtros sobre las filas, así una consulta sin filtro de grupo devuelve
// datos de otros grupos y la prueba lo detecta. Los filtros sobre tablas embebidas
// ('tabla.columna') se ignoran: no hay joins.
class Consulta {
  constructor(tablas, tabla) {
    this.tablas = tablas;
    this.tabla = tabla;
    this.filtros = [];
    this.operacion = 'select';
    this.datos = null;
  }

  select() { return this; }
  insert(filas) { this.operacion = 'insert'; this.datos = filas; return this; }
  update(valores) { this.operacion = 'update'; this.datos = valores; return this; }
  delete() { this.operacion = 'delete'; return this; }
  order() { return this; }
  limit() { return this; }

  filtrar(columna, prueba) {
    if (!columna.includes('.')) this.filtros.push((fila) => prueba(fila[columna]));
    return this;
  }
  eq(columna, valor) { return this.filtrar(columna, (v) => v === valor); }
  in(columna, valores) { return this.filtrar(columna, (v) => valores.includes(v)); }
  lt(columna, valor) { return this.filtrar(columna, (v) => v < valor); }
  lte(columna, valor) { return this.filtrar(columna, (v) => v <= valor); }

  async ejecutar() {
    const filas = (this.tablas[this.tabla] ??= []);
    const coincide = (fila) => this.filtros.every((f) => f(fila));

    if (this.operacion === 'insert') {
      const nuevas = this.datos.map((f) => ({ id: crypto.randomUUID(), ...f }));
      filas.push(...nuevas);
      return { data: nuevas, error: null };
    }
    if (this.operacion === 'update') {
      const afectadas = filas.filter(coincide);
      afectadas.forEach((f) => Object.assign(f, this.datos));
      return { data: afectadas, error: null };
    }
    if (this.operacion === 'delete') {
      const borradas = filas.filter(coincide);
      this.tablas[this.tabla] = filas.filter((f) => !coincide(f));
      return { data: borradas, error: null };
    }
    return { data: filas.filter(coincide).map((f) => ({ ...f })), error: null };
  }

  then(resolver, rechazar) { return this.ejecutar().then(resolver, rechazar); }

  async maybeSingle() {
    const { data, error } = await this.ejecutar();
    return { data: data[0] ?? null, error };
  }

  async single() {
    const { data } = await this.ejecutar();
    return data.length === 1
      ? { data: data[0], error: null }
      : { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } };
  }
}

// Uso: supabase.from = supabaseFalso({ contactos: [...], groups: [...] })
export const supabaseFalso = (tablas) => (tabla) => new Consulta(tablas, tabla);
