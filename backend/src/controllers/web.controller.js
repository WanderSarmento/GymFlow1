const { prisma } = require('../services/prisma.service');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * Incrementa (+1) ou decrementa (-1) a ocupação atual via Botoeira Virtual Web.
 * Body: { action: 'in' | 'out' }
 */
async function webUpdateOccupancy(req, res) {
  const { action } = req.body; // 'in' ou 'out'

  try {
    const { data: registro, error: fetchError } = await supabase
      .from('ocupacao_academia')
      .select('total_presentes')
      .eq('id', 1)
      .single();

    if (fetchError) throw fetchError;

    let novoTotal = registro.total_presentes;
    if (action === 'in') novoTotal += 1;
    if (action === 'out') novoTotal = Math.max(0, novoTotal - 1);

    const { error: updateError } = await supabase
      .from('ocupacao_academia')
      .update({ total_presentes: novoTotal, ultima_atualizacao: new Date() })
      .eq('id', 1);

    if (updateError) throw updateError;

    return res.json({ success: true, total_presentes: novoTotal });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Define a ocupação para um valor exato (personal digita o número manualmente).
 * Body: { valor: number }
 */
async function webSetOccupancy(req, res) {
  const { valor } = req.body; // Número exato ex: 12

  if (valor < 0) return res.status(400).json({ error: "Valor não pode ser negativo" });

  try {
    const { error } = await supabase
      .from('ocupacao_academia')
      .update({ total_presentes: valor, ultima_atualizacao: new Date() })
      .eq('id', 1);

    if (error) throw error;
    return res.json({ success: true, total_presentes: valor });
  } catch (error) {
    return res.status(500).json({ error: error.message });
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
