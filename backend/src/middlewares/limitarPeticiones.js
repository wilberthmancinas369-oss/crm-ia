// Contadores por usuario validado, compartidos entre las rutas de esta instancia.
// Para varias instancias se necesita un almacén compartido.
export function crearLimitadorUsuario({ maximo = 100, ventanaMs = 60_000, ahora = Date.now } = {}) {
  const contadores = new Map();
  let proximaLimpieza = 0;

  return (req, res, next) => {
    if (!req.user?.id) return res.status(401).json({ error: 'Usuario no autenticado' });

    const tiempo = ahora();
    if (tiempo >= proximaLimpieza) {
      for (const [id, contador] of contadores) {
        if (tiempo >= contador.expira) contadores.delete(id);
      }
      proximaLimpieza = tiempo + ventanaMs;
    }

    const id = req.user.id;
    let contador = contadores.get(id);
    if (!contador || tiempo >= contador.expira) {
      contador = { peticiones: 0, expira: tiempo + ventanaMs };
      contadores.set(id, contador);
    }

    if (contador.peticiones >= maximo) {
      const segundos = Math.max(1, Math.ceil((contador.expira - tiempo) / 1000));
      res.setHeader('Retry-After', String(segundos));
      return res.status(429).json({
        error: 'Demasiadas peticiones. Espera un momento y vuelve a intentarlo.',
        reintentarEnSegundos: segundos
      });
    }

    contador.peticiones += 1;
    next();
  };
}

export const limitarPeticionesUsuario = crearLimitadorUsuario();
