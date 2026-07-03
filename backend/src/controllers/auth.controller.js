const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../services/prisma.service');

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Busca a única academia cadastrada no sistema (single-tenant)
    const gym = await prisma.gym.findFirst();

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'gymflow_jwt_secret_key_ultra_secure_12345',
      { expiresIn: '7d' }
    );

    // Remove a hash de senha da resposta
    const { passwordHash, ...userWithoutPassword } = user;

    return res.status(200).json({
      token,
      user: {
        ...userWithoutPassword,
        gym // Injeta a academia no objeto do usuário para compatibilidade com o frontend
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
}

async function getMe(req, res) {
  try {
    const { passwordHash, ...userWithoutPassword } = req.user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
}

module.exports = { login, getMe };
