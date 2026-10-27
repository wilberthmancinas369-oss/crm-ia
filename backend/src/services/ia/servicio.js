import { crearGemini, validarRespuesta } from './gemini.js';
import { ErrorIA } from './errores.js';

export const iaService = {
  async generar(contexto) {
    if ((process.env.IA_PROVEEDOR || 'gemini') !== 'gemini') throw new ErrorIA(503, 'IA_NO_CONFIGURADA', 'Proveedor de IA no configurado.');
    return validarRespuesta(await crearGemini({ apiKey: process.env.GEMINI_API_KEY, modelo: process.env.GEMINI_MODEL }).generar(contexto));
  }
};

// Una instancia: 5 intentos por usuario/empresa cada 10 minutos; fallos también consumen.
// Para desplegar varias instancias se debe sustituir por almacenamiento compartido.
export function crearLimitador({ maximo = 5, ventanaMs = 600000, reloj = Date.now } = {}) {
  const usuarios = new Map();
  return clave => {
    const ahora = reloj();
    for (const [key, valor] of usuarios) if (valor.fin <= ahora) usuarios.delete(key);
    const actual = usuarios.get(clave) ?? { intentos: 0, fin: ahora + ventanaMs };
    if (actual.intentos >= maximo || (!usuarios.has(clave) && usuarios.size >= 10000)) {
      throw new ErrorIA(429, 'IA_LIMITE_USUARIO', 'Alcanzaste el límite de sugerencias. Intenta más tarde.', Math.max(1, Math.ceil((actual.fin - ahora) / 1000)));
    }
    actual.intentos++;
    usuarios.set(clave, actual);
  };
}
