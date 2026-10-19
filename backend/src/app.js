import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes.js';
import contactosRoutes from './routes/contactos.routes.js';
import oportunidadesRoutes from './routes/oportunidades.routes.js';
import interaccionesRouter from './routes/interacciones.routes.js';
import gruposRoutes from './routes/grupos.routes.js';
import invitacionesRoutes from './routes/invitaciones.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import reportesRoutes from './routes/reportes.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Registro de rutas
app.use('/api/auth', authRoutes);
app.use('/api/contactos', contactosRoutes);
app.use('/api/oportunidades', oportunidadesRoutes);
app.use('/api/interacciones', interaccionesRouter);
app.use('/api/grupos', gruposRoutes);
app.use('/api/invitaciones', invitacionesRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/reportes', reportesRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('CRM con IA Backend - Servidor funcionando correctamente 🚀');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});