// Escapa los comodines de LIKE para buscar texto literal, incluido el carácter de escape.
export const patronTexto = (texto) => `%${texto.replace(/[\\%_]/g, '\\$&')}%`;

// Los valores en una expresión OR de PostgREST deben ir entre comillas y escapados.
export const valorOr = (valor) => `"${valor.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
