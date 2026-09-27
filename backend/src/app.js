import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
import contactosRoutes from './routes/contactos.routes.js';
import oportunidadesRoutes from './routes/oportunidades.routes.js'
import interaccionesRouter from './routes/interacciones.routes.js';
app.use('/api/contactos', contactosRoutes);
app.use('/api/oportunidades', oportunidadesRoutes);
app.use('/api/interacciones', interaccionesRouter);

// Test Route
app.get('/', (req, res) => {
  res.send('CRM con IA Backend - Servidor funcionando correctamente 🚀');
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
