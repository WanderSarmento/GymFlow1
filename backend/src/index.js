require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const iotRoutes = require('./routes/iot.routes');
const gymRoutes = require('./routes/gym.routes');

const app = express();

// Habilita CORS para desenvolvimento local cross-origin
app.use(cors());
app.use(express.json());

// Registro de Rotas da API v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/iot', iotRoutes);
app.use('/api/v1/gyms', gymRoutes);

// Rota de Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error('[Error Handled]:', err.stack);
  res.status(500).json({ error: 'Algo deu errado no servidor!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  GymFlow Backend rodando na porta ${PORT}`);
  console.log(`  Modo: Academia Única (Single-Tenant)`);
  console.log(`  Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});
