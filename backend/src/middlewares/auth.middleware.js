const { createClient } = require('@supabase/supabase-js');
const { prisma } = require('../services/prisma.service');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Middleware básico de autenticação integrado ao Supabase
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação ausente ou inválido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !supabaseUser) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    // Busca o usuário no banco de dados local pelo e-mail
    let user = await prisma.user.findUnique({
      where: { email: supabaseUser.email }
    });

    // Se o usuário não existir localmente, cria para sincronização
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          passwordHash: '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
          role: supabaseUser.app_metadata?.role === 'admin' ? 'OWNER' : 'STAFF'
        }
      });
    }

    // Busca a única academia cadastrada no sistema (single-tenant)
    const gym = await prisma.gym.findFirst();

    req.user = { ...user, gym, gymId: gym?.id };
    next();
  } catch (error) {
    console.error('Erro na autenticação do Supabase:', error);
    return res.status(401).json({ error: 'Erro ao validar token de autenticação.' });
  }
}

function checkRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado. Nível de permissão insuficiente.' });
    }

    next();
  };
}

module.exports = { authMiddleware, checkRoles };
