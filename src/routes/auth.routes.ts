import { Router } from 'express';
import { register, login, refreshToken, forgotPassword, verifyCode, resetPassword } from '../controllers/auth.controller';

const router = Router();
router.post('/register',        register);
router.post('/login',           login);
router.post('/refresh',         refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/verify-code',     verifyCode);
router.post('/reset-password',  resetPassword);
export default router;
