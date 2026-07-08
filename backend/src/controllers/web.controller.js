const { prisma } = require('../services/prisma.service');

/**
 * Incrementa (+1) ou decrementa (-1) a ocupação atual via Botoeira Virtual Web.
 * Body: { action: 'in' | 'out' }
 */
async function webUpdateOccupancy(req, res) {
  const { action } = req.body;

  if (!['in', 'out'].includes(action)) {
    return res.status(400).json({ error: 'Ação inválida. Use "in" ou "out".' });
  }

  try {
    const gym = await prisma.gym.findFirst();

    if (!gym) {
      return res.status(500).json({ error: 'Nenhuma academia cadastrada no sistema.' });
    }

    let novaOcupacao = gym.currentOccupancy;

    if (action === 'in') {
      novaOcupacao = Math.min(gym.capacity, gym.currentOccupancy + 1);
    } else if (action === 'out') {
      novaOcupacao = Math.max(0, gym.currentOccupancy - 1);
    }

    const gymAtualizada = await prisma.gym.update({
      where: { id: gym.id },
      data: { currentOccupancy: novaOcupacao }
    });

    // Registra o log para estatísticas de horários de pico
    await prisma.occupancyLog.create({
      data: { occupancy: novaOcupacao }
    });

    return res.status(200).json({
      success: true,
      currentOccupancy: novaOcupacao,
      capacity: gymAtualizada.capacity
    });
  } catch (error) {
    console.error('Erro ao atualizar ocupação via painel web:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar ocupação.' });
  }
}

/**
 * Define a ocupação para um valor exato (personal digita o número manualmente).
 * Body: { valor: number }
 */
async function webSetOccupancy(req, res) {
  const { valor } = req.body;

  if (valor === undefined || valor === null) {
    return res.status(400).json({ error: 'Campo "valor" é obrigatório.' });
  }

  const novaOcupacao = parseInt(valor, 10);

  if (isNaN(novaOcupacao) || novaOcupacao < 0) {
    return res.status(400).json({ error: 'Valor inválido. Deve ser um número inteiro não negativo.' });
  }

  try {
    const gym = await prisma.gym.findFirst();

    if (!gym) {
      return res.status(500).json({ error: 'Nenhuma academia cadastrada no sistema.' });
    }

    // Garante que o valor não ultrapassa a capacidade máxima
    const ocupacaoFinal = Math.min(novaOcupacao, gym.capacity);

    const gymAtualizada = await prisma.gym.update({
      where: { id: gym.id },
      data: { currentOccupancy: ocupacaoFinal }
    });

    // Registra o log para estatísticas de horários de pico
    await prisma.occupancyLog.create({
      data: { occupancy: ocupacaoFinal }
    });

    return res.status(200).json({
      success: true,
      currentOccupancy: ocupacaoFinal,
      capacity: gymAtualizada.capacity
    });
  } catch (error) {
    console.error('Erro ao definir ocupação via painel web:', error);
    return res.status(500).json({ error: 'Erro interno ao definir ocupação.' });
  }
}

/**
 * Retorna a ocupação atual da academia (para carregar o contador ao abrir o painel).
 */
async function webGetOccupancy(req, res) {
  try {
    const gym = await prisma.gym.findFirst({
      select: {
        currentOccupancy: true,
        capacity: true,
        isOpen: true,
        name: true
      }
    });

    if (!gym) {
      return res.status(500).json({ error: 'Nenhuma academia cadastrada no sistema.' });
    }

    return res.status(200).json({
      currentOccupancy: gym.currentOccupancy,
      capacity: gym.capacity,
      isOpen: gym.isOpen,
      name: gym.name
    });
  } catch (error) {
    console.error('Erro ao buscar ocupação para o painel web:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar ocupação.' });
  }
}

module.exports = { webUpdateOccupancy, webSetOccupancy, webGetOccupancy };
