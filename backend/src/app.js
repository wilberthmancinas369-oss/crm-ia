const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
const contactosRoutes = require('./routes/contactos.routes');
const oportunidadesRoutes = require('./routes/oportunidades.routes');

app.use('/api/contactos', contactosRoutes);
app.use('/api/oportunidades', oportunidadesRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('CRM con IA Backend - Servidor funcionando correctamente 🚀');
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
