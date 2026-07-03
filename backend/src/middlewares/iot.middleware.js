const { prisma } = require('../services/prisma.service');

async function iotAuthMiddleware(req, res, next) {
  const apiKey = req.header('X-API-KEY');
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Acesso não autorizado. Chave X-API-KEY ausente no cabeçalho.' });
  }

  try {
    const gym = await prisma.gym.findUnique({
      where: { apiKey }
    });

    if (!gym) {
      return res.status(403).json({ error: 'Chave API Key inválida.' });
    }

    if (gym.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Acesso negado. Esta academia está suspensa.' });
    }

    // Anexa a academia correspondente ao request
    req.gym = gym;
    next();
  } catch (error) {
    console.error('Erro na validação da API Key:', error);
    return res.status(500).json({ error: 'Erro interno na validação da API Key.' });
  }
}

module.exports = { iotAuthMiddleware };
