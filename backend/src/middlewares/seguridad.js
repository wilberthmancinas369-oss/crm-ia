import helmet from 'helmet';
import cors from 'cors';

export function configurarSeguridad(app, { frontendUrl = process.env.FRONTEND_URL } = {}) {
  let url;
  try { url = new URL(frontendUrl); } catch {
    throw new Error('FRONTEND_URL debe definir el origen HTTP(S) del frontend');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('FRONTEND_URL debe contener solo el origen HTTP(S), sin rutas ni credenciales');
  }

  app.use(helmet());
  // CORS no sustituye la autenticación ni el aislamiento por empresa.
  // Clientes sin Origin (servidores/CLI) siguen sujetos a los permisos de las rutas.
  app.use((req, res, next) => {
    res.vary('Origin');
    const origin = req.get('Origin');
    if (origin && origin !== url.origin) {
      return res.status(403).json({ error: 'Origen no permitido' });
    }
    next();
  });
  app.use(cors({
    origin: url.origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Retry-After'],
  }));
}
