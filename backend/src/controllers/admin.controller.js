const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { prisma } = require('../services/prisma.service');
const { getIo } = require('../services/socket.service');

// Retorna dados globais do sistema SaaS para o Super Admin
async function getGlobalDashboard(req, res) {
  try {
    const totalGyms = await prisma.gym.count();
    const activeGyms = await prisma.gym.count({ where: { status: 'ACTIVE' } });
    const suspendedGyms = await prisma.gym.count({ where: { status: 'SUSPENDED' } });
    const totalDevices = await prisma.device.count();
    const activeDevices = await prisma.device.count({ where: { status: 'ONLINE' } });
    const totalUsers = await prisma.user.count();

    // Estimativa de faturamento SaaS (ex: R$ 149,90 por academia ativa/mês)
    const subscriptionPrice = 149.90;
    const monthlyBilling = activeGyms * subscriptionPrice;

    // Busca todas as academias com resumos rápidos
    const gyms = await prisma.gym.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true }
        },
        devices: {
          select: { id: true, name: true, status: true, lastSeen: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      metrics: {
        totalGyms,
        activeGyms,
        suspendedGyms,
        totalDevices,
        activeDevices,
        totalUsers,
        monthlyBilling
      },
      gyms
    });
  } catch (error) {
    console.error('Erro ao carregar painel global:', error);
    return res.status(500).json({ error: 'Erro ao carregar dados do painel do Super Admin.' });
  }
}

// Cria uma nova academia e seu primeiro usuário administrador (Dono)
async function createGym(req, res) {
  const { gymName, slug, capacity, ownerName, ownerEmail, ownerPassword } = req.body;

  if (!gymName || !slug || !ownerName || !ownerEmail || !ownerPassword) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return res.status(400).json({ error: 'O slug deve conter apenas letras minúsculas, números e hifens.' });
  }

  try {
    // Verifica se slug ou e-mail já existem
    const existingSlug = await prisma.gym.findUnique({ where: { slug } });
    if (existingSlug) {
      return res.status(400).json({ error: 'Este slug de academia já está em uso.' });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (existingEmail) {
      return res.status(400).json({ error: 'Este e-mail de usuário já está cadastrado.' });
    }

    const apiKey = `gf_${crypto.randomBytes(24).toString('hex')}`;
    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    // Cria academia, usuário dono e dispositivo simulador padrão em transação
    const result = await prisma.$transaction(async (tx) => {
      const gym = await tx.gym.create({
        data: {
          name: gymName,
          slug,
          capacity: parseInt(capacity, 10) || 100,
          apiKey
        }
      });

      const user = await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          passwordHash,
          role: 'OWNER',
          gymId: gym.id
        }
      });

      // Cria um dispositivo IoT padrão para essa academia
      const device = await tx.device.create({
        data: {
          name: 'ESP32 Principal',
          gymId: gym.id,
          status: 'OFFLINE'
        }
      });

      // Cria log inicial
      await tx.occupancyLog.create({
        data: {
          gymId: gym.id,
          occupancy: 0
        }
      });

      return { gym, user, device };
    });

    return res.status(201).json({
      success: true,
      message: 'Academia e Dono cadastrados com sucesso!',
      gym: result.gym
    });
  } catch (error) {
    console.error('Erro ao cadastrar academia:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar os dados.' });
  }
}

// Suspende ou reativa uma academia
async function toggleGymStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body; // 'ACTIVE' ou 'SUSPENDED'

  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  try {
    const updatedGym = await prisma.gym.update({
      where: { id },
      data: { status }
    });

    // Notifica via WebSocket que o status da academia mudou
    const io = getIo();
    const payload = {
      gymId: updatedGym.id,
      slug: updatedGym.slug,
      status: updatedGym.status
    };
    io.to(`gym:${updatedGym.id}`).emit('gym_status_changed', payload);
    io.to(`gym:${updatedGym.slug}`).emit('gym_status_changed', payload);

    return res.status(200).json(updatedGym);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao alterar status da academia.' });
  }
}

module.exports = {
  getGlobalDashboard,
  createGym,
  toggleGymStatus
};
