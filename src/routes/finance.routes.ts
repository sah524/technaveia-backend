import { Router } from 'express';
import { getSummary, requestWithdraw } from '../controllers/finance.controller';
import { authMiddleware, techOnly } from '../middlewares/auth.middleware';
const router = Router();
router.use(authMiddleware, techOnly);
router.get('/summary',   getSummary);
router.post('/withdraw', requestWithdraw);
export default router;
