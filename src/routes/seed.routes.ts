import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';

const router = Router();

/**
 * GET /seed
 * Cria o usuário admin inicial.
 * ⚠️  REMOVA ESTA ROTA APÓS USAR — ela não tem autenticação!
 */
router.get('/', async (req, res) => {
  // Proteção mínima: só roda se a variável SEED_SECRET bater
  const { secret } = req.query;
  if (secret !== process.env.SEED_SECRET) {
    return res.status(403).json({ message: 'Proibido' });
  }

  try {
    // Evita criar duplicado
    const exists = await prisma.usuario.findUnique({
      where: { email: 'admin@technaveia.com' },
    });

    if (exists) {
      return res.json({ message: 'Admin já existe', email: exists.email });
    }

    const senhaHash = await bcrypt.hash('admin123', 10);

    const admin = await prisma.usuario.create({
      data: {
        nome:  'Admin TechNaVeia',
        email: 'admin@technaveia.com',
        senha: senhaHash,
        role:  'admin',
      },
      select: { id: true, nome: true, email: true, role: true },
    });

    return res.json({ message: 'Admin criado com sucesso!', data: admin });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro ao criar admin' });
  }
});

export default router;