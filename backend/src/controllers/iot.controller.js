const { prisma } = require('../services/prisma.service');

async function updateOccupancy(req, res) {
  const { action } = req.body;

  try {
    // Busca a única academia cadastrada no sistema (single-tenant)
    const gym = await prisma.gym.findFirst();

    if (!gym) {
      return res.status(500).json({ error: 'Nenhuma academia cadastrada no sistema.' });
    }

    let newOccupancy = gym.currentOccupancy;

    if (action === 'in') {
      newOccupancy = Math.min(gym.capacity, gym.currentOccupancy + 1);
    } else if (action === 'out') {
      newOccupancy = Math.max(0, gym.currentOccupancy - 1);
    } else {
      return res.status(400).json({ error: 'Ação inválida. Use "in" ou "out".' });
    }

    // Atualiza a ocupação no banco de dados
    const updatedGym = await prisma.gym.update({
      where: { id: gym.id },
      data: { currentOccupancy: newOccupancy }
    });

    // Registra o log no banco de dados para estatísticas de horários de pico
    await prisma.occupancyLog.create({
      data: {
        occupancy: newOccupancy
      }
    });

    return res.status(200).json({
      success: true,
      currentOccupancy: newOccupancy,
      capacity: updatedGym.capacity,
      isOpen: updatedGym.isOpen
    });
  } catch (error) {
    console.error('Erro ao atualizar lotação via IoT:', error);
    return res.status(500).json({ error: 'Erro interno ao processar sinal do hardware.' });
  }
}

module.exports = { updateOccupancy };
