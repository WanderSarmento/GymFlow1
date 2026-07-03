const { prisma } = require('../services/prisma.service');
const { getIo } = require('../services/socket.service');

// Retorna detalhes da academia para visualização pública (busca por slug)
async function getPublicGym(req, res) {
  const { slug } = req.params;

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        capacity: true,
        currentOccupancy: true,
        isOpen: true,
        businessHours: true,
        address: true,
        logoUrl: true,
        primaryColor: true,
        backgroundColor: true
      }
    });

    if (!gym) {
      return res.status(404).json({ error: 'Academia não encontrada.' });
    }

    return res.status(200).json(gym);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar dados da academia.' });
  }
}

// Retorna dados completos para o Dono (busca a única academia do sistema)
async function getOwnerGym(req, res) {
  try {
    const gym = await prisma.gym.findFirst();

    if (!gym) {
      return res.status(404).json({ error: 'Nenhuma academia cadastrada no sistema.' });
    }

    return res.status(200).json(gym);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar dados da academia.' });
  }
}

// Atualiza configurações da academia (capacidade, aberto/fechado, horário de funcionamento)
async function updateGymSettings(req, res) {
  const { name, capacity, isOpen, businessHours, address } = req.body;

  try {
    const gym = await prisma.gym.findFirst();
    if (!gym) return res.status(404).json({ error: 'Academia não encontrada.' });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity, 10);
    if (isOpen !== undefined) updateData.isOpen = !!isOpen;
    if (businessHours !== undefined) updateData.businessHours = businessHours;
    if (address !== undefined) updateData.address = address;

    // Se fechar a academia, resetar a ocupação atual para 0
    if (isOpen === false) {
      updateData.currentOccupancy = 0;
    }

    const updatedGym = await prisma.gym.update({
      where: { id: gym.id },
      data: updateData
    });

    // Registra log da mudança se tiver zerado
    if (isOpen === false) {
      await prisma.occupancyLog.create({
        data: { occupancy: 0 }
      });
    }

    // Emite no socket em tempo real
    const io = getIo();
    const payload = {
      gymId: updatedGym.id,
      slug: updatedGym.slug,
      name: updatedGym.name,
      currentOccupancy: updatedGym.currentOccupancy,
      capacity: updatedGym.capacity,
      isOpen: updatedGym.isOpen,
      businessHours: updatedGym.businessHours,
      address: updatedGym.address
    };

    io.to(`gym:${updatedGym.id}`).emit('occupancy_update', payload);
    io.to(`gym:${updatedGym.slug}`).emit('occupancy_update', payload);

    return res.status(200).json(updatedGym);
  } catch (error) {
    console.error('Erro ao atualizar configurações da academia:', error);
    return res.status(500).json({ error: 'Erro ao salvar alterações.' });
  }
}

// Busca logs agrupando por hora para análise de horários de pico
async function getPeakHours(req, res) {
  try {
    const logs = await prisma.occupancyLog.findMany({
      orderBy: { timestamp: 'asc' }
    });

    // Inicializa a estrutura de 24 horas
    const hourlyStats = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      total: 0,
      count: 0
    }));

    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourlyStats[hour].total += log.occupancy;
      hourlyStats[hour].count += 1;
    });

    const peakHours = hourlyStats.map(stat => ({
      hour: `${String(stat.hour).padStart(2, '0')}:00`,
      avgOccupancy: stat.count > 0 ? Math.round(stat.total / stat.count) : 0
    }));

    return res.status(200).json(peakHours);
  } catch (error) {
    console.error('Erro ao processar horários de pico:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório de picos.' });
  }
}

// Busca logs agrupando por hora para análise de horários de pico (Público, busca por slug)
async function getPublicPeakHours(req, res) {
  const { slug } = req.params;

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!gym) {
      return res.status(404).json({ error: 'Academia não encontrada.' });
    }

    const logs = await prisma.occupancyLog.findMany({
      orderBy: { timestamp: 'asc' }
    });

    // Inicializa a estrutura de 24 horas
    const hourlyStats = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      total: 0,
      count: 0
    }));

    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourlyStats[hour].total += log.occupancy;
      hourlyStats[hour].count += 1;
    });

    const peakHours = hourlyStats.map(stat => ({
      hour: `${String(stat.hour).padStart(2, '0')}:00`,
      avgOccupancy: stat.count > 0 ? Math.round(stat.total / stat.count) : 0
    }));

    return res.status(200).json(peakHours);
  } catch (error) {
    console.error('Erro ao processar horários de pico públicos:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório de picos.' });
  }
}

// Atualiza configurações visuais da academia (logo, cores)
async function updateGymVisuals(req, res) {
  const { primaryColor, backgroundColor, removeLogo } = req.body;
  const { uploadGymLogo } = require('../services/supabase.service');

  try {
    const gym = await prisma.gym.findFirst();
    if (!gym) return res.status(404).json({ error: 'Academia não encontrada.' });

    const updateData = {};

    // Se solicitado para remover o logo, define como nulo
    if (removeLogo === 'true') {
      updateData.logoUrl = null;
    }

    // Validação de formato HEX para as cores
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;

    if (primaryColor) {
      if (!hexRegex.test(primaryColor)) {
        return res.status(400).json({ error: 'Cor primária inválida. Deve ser um código HEX válido (ex: #FF0000).' });
      }
      updateData.primaryColor = primaryColor;
    }

    if (backgroundColor) {
      if (!hexRegex.test(backgroundColor)) {
        return res.status(400).json({ error: 'Cor de fundo inválida. Deve ser um código HEX válido (ex: #000000).' });
      }
      updateData.backgroundColor = backgroundColor;
    }

    // Se houver arquivo enviado pelo Multer e não estiver removendo
    if (req.file && removeLogo !== 'true') {
      // Validação de tipo de arquivo
      const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Tipo de arquivo inválido. Apenas PNG, JPG e JPEG são permitidos.' });
      }

      // Validação de tamanho (máximo 2MB)
      if (req.file.size > 2 * 1024 * 1024) {
        return res.status(400).json({ error: 'Arquivo muito grande. O tamanho máximo permitido é 2MB.' });
      }

      // Faz upload para o Supabase Storage (ou fallback local)
      const logoUrl = await uploadGymLogo(req.file.buffer, req.file.originalname, req.file.mimetype);
      updateData.logoUrl = logoUrl;
    }

    const updatedGym = await prisma.gym.update({
      where: { id: gym.id },
      data: updateData
    });

    // Emite no socket em tempo real para atualizar o visual instantaneamente na tela pública
    const io = getIo();
    const payload = {
      gymId: updatedGym.id,
      slug: updatedGym.slug,
      name: updatedGym.name,
      currentOccupancy: updatedGym.currentOccupancy,
      capacity: updatedGym.capacity,
      isOpen: updatedGym.isOpen,
      businessHours: updatedGym.businessHours,
      logoUrl: updatedGym.logoUrl,
      primaryColor: updatedGym.primaryColor,
      backgroundColor: updatedGym.backgroundColor
    };

    io.to(`gym:${updatedGym.id}`).emit('occupancy_update', payload);
    io.to(`gym:${updatedGym.slug}`).emit('occupancy_update', payload);

    return res.status(200).json(updatedGym);
  } catch (error) {
    console.error('Erro ao atualizar configurações visuais da academia:', error);
    return res.status(500).json({ error: 'Erro ao salvar alterações visuais.' });
  }
}

module.exports = {
  getPublicGym,
  getOwnerGym,
  updateGymSettings,
  getPeakHours,
  getPublicPeakHours,
  updateGymVisuals
};
