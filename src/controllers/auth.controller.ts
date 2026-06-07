import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// Armazenamento temporário de códigos de recuperação em memória.
// Em produção, substitua por uma tabela no banco (ex.: PasswordResetCode)
// com campos: email, code (hash), expiresAt.
const resetCodes = new Map<string, { code: string; expiresAt: Date }>();

function generateTokens(userId: string, role: string) {
  const jwtSecret = process.env.JWT_SECRET!;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;

  const token = jwt.sign(
    { userId, role },
    jwtSecret,
    { expiresIn: '7d' }
  );

  const refreshToken = jwt.sign(
    { userId },
    jwtRefreshSecret,
    { expiresIn: '30d' }
  );

  return { token, refreshToken };
}

// ── POST /v1/auth/register ────────────────────────────────

export async function register(req: Request, res: Response) {
  try {
    const { nome, email, cpf, telefone, senha, role = 'cliente' } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ success: false, message: 'Nome, e-mail e senha são obrigatórios' });
    }

    const exists = await prisma.usuario.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ success: false, message: 'E-mail já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const user = await prisma.usuario.create({
      data: { nome, email, cpf, telefone, senha: senhaHash, role },
      select: { id: true, nome: true, email: true, role: true, createdAt: true },
    });

    const { token, refreshToken } = generateTokens(user.id, user.role);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return res.status(201).json({
      success: true,
      token,
      refreshToken,
      userType: user.role,
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Erro ao criar conta' });
  }
}

// ── POST /v1/auth/login ───────────────────────────────────

export async function login(req: Request, res: Response) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios' });
    }

    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user || !await bcrypt.compare(senha, user.senha)) {
      return res.status(401).json({ success: false, message: 'E-mail ou senha incorretos' });
    }

    if (user.bloqueado) {
      return res.status(403).json({ success: false, message: 'Conta bloqueada. Entre em contato com o suporte.' });
    }

    const { token, refreshToken } = generateTokens(user.id, user.role);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return res.json({
      success: true,
      token,
      refreshToken,
      userType: user.role,
      user: { id: user.id, nome: user.nome, email: user.email, foto: user.foto, role: user.role },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Erro ao fazer login' });
  }
}

// ── POST /v1/auth/refresh ─────────────────────────────────

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token não fornecido' });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Refresh token inválido ou expirado' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET ?? '') as { userId: string };
    const user = await prisma.usuario.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    const tokens = generateTokens(user.id, user.role);

    // Rotaciona o refresh token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        usuarioId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return res.json({ success: true, ...tokens });
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
}

// ── POST /v1/auth/forgot-password ─────────────────────────

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    const user = await prisma.usuario.findUnique({ where: { email } });

    // Retorna sucesso mesmo se não encontrou (evita enumeração de e-mails)
    if (!user) {
      return res.json({ success: true, message: 'Se o e-mail existir, você receberá o código.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Salva o código em memória (substitua por banco em produção)
    resetCodes.set(email, { code, expiresAt });

    // TODO: integrar serviço de e-mail (ex.: nodemailer, SendGrid) para enviar o código
    console.log(`📧 Código de recuperação para ${email}: ${code}`);

    return res.json({ success: true, message: 'Código enviado para o e-mail cadastrado.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao enviar código' });
  }
}

// ── POST /v1/auth/verify-code ─────────────────────────────

export async function verifyCode(req: Request, res: Response) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'E-mail e código são obrigatórios' });
    }

    const stored = resetCodes.get(email);

    if (!stored || stored.expiresAt < new Date()) {
      resetCodes.delete(email);
      return res.status(400).json({ success: false, message: 'Código inválido ou expirado' });
    }

    if (stored.code !== code) {
      return res.status(400).json({ success: false, message: 'Código inválido ou expirado' });
    }

    // Código válido — remove para não reutilizar
    resetCodes.delete(email);

    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET ?? '', { expiresIn: '15m' });
    return res.json({ success: true, token: resetToken });
  } catch {
    return res.status(500).json({ success: false, message: 'Erro ao verificar código' });
  }
}

// ── POST /v1/auth/reset-password ──────────────────────────

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token e nova senha são obrigatórios' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? '') as { email: string };

    const senhaHash = await bcrypt.hash(newPassword, 10);
    await prisma.usuario.update({
      where: { email: decoded.email },
      data: { senha: senhaHash },
    });

    return res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch {
    return res.status(400).json({ success: false, message: 'Token inválido ou expirado' });
  }
}