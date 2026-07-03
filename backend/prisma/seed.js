const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando semeação do banco de dados (Seeding)...');

  // Limpa banco existente
  await prisma.occupancyLog.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.gym.deleteMany({});

  // Hashes de senha
  const adminPasswordHash = await bcrypt.hash('adminpassword123', 10);
  const ownerPasswordHash = await bcrypt.hash('ownerpassword123', 10);

  // 1. Cria a Academia Sede (Single Tenant)
  const gym1 = await prisma.gym.create({
    data: {
      name: 'GymFlow Centro',
      slug: 'gymflow-centro',
      capacity: 50,
      currentOccupancy: 12,
      isOpen: true,
      businessHours: 'Seg a Sex: 06h às 22h | Sáb: 08h às 14h',
      address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      primaryColor: '#7C3AED',
      backgroundColor: '#09090b'
    }
  });
  console.log('✓ Academia cadastrada: GymFlow Centro (slug: gymflow-centro)');

  // 2. Cria o Usuário Gestor (Dono da Academia)
  const owner = await prisma.user.create({
    data: {
      name: 'Gestor Centro',
      email: 'owner@gymflow.com',
      passwordHash: ownerPasswordHash,
      role: 'OWNER',
    }
  });
  console.log('✓ Dono de Academia criado: owner@gymflow.com / ownerpassword123');

  // 3. Cria um segundo usuário para fins de compatibilidade com demo (antigo admin)
  await prisma.user.create({
    data: {
      name: 'Wander (Administrador)',
      email: 'admin@gymflow.com',
      passwordHash: adminPasswordHash,
      role: 'OWNER',
    }
  });
  console.log('✓ Administrador criado: admin@gymflow.com / adminpassword123');

  // 4. Cria Logs Históricos de Lotação realistas dos últimos 7 dias
  console.log('Semeando logs de ocupação realistas para gráficos de horários de pico...');
  const logsToInsert = [];
  const now = new Date();

  // Curva de ocupação média de academia (peso por hora de 0 a 23)
  const hourlyOccupancyWeights = [
    1,   // 00h
    0,   // 01h
    0,   // 02h
    0,   // 03h
    0,   // 04h
    2,   // 05h
    15,  // 06h (Início)
    30,  // 07h (Pico Manhã)
    42,  // 08h (Pico Manhã)
    25,  // 09h
    18,  // 10h
    15,  // 11h
    22,  // 12h (Almoço)
    24,  // 13h (Almoço)
    16,  // 14h
    14,  // 15h
    22,  // 16h
    35,  // 17h (Pico Tarde/Noite)
    45,  // 18h (Pico Tarde/Noite)
    48,  // 19h (Pico Máximo)
    38,  // 20h
    25,  // 21h
    14,  // 22h
    5    // 23h
  ];

  // Semeia 7 dias de logs
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const logDate = new Date(now);
    logDate.setDate(now.getDate() - dayOffset);

    // Cria logs para cada hora útil
    for (let hour = 6; hour <= 23; hour++) {
      const baseOccupancy = hourlyOccupancyWeights[hour];
      // Adiciona uma pequena variação aleatória de +/- 4 pessoas
      const randomOffset = Math.floor(Math.random() * 9) - 4;
      const occupancy = Math.max(0, Math.min(gym1.capacity, baseOccupancy + randomOffset));

      const entryTime = new Date(logDate);
      entryTime.setHours(hour);
      entryTime.setMinutes(Math.floor(Math.random() * 60));
      entryTime.setSeconds(0);

      logsToInsert.push({
        occupancy: occupancy,
        timestamp: entryTime
      });
    }
  }

  // Insere logs em lote
  await prisma.occupancyLog.createMany({
    data: logsToInsert
  });

  console.log(`✓ Semeados ${logsToInsert.length} logs de ocupação com sucesso.`);
  console.log('Semeação concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro na semeação:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
