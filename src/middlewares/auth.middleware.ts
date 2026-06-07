import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? '') as { userId: string; role: string };
    req.userId   = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acesso negado' });
  }
  next();
}

export function techOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'tecnico' && req.userRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acesso restrito a técnicos' });
  }
  next();
}