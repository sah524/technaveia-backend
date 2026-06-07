import { Router } from 'express';
import { listConversations, getMessages, sendMessage } from '../controllers/chat.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
const router = Router();
router.use(authMiddleware);
router.get('/',                   listConversations);
router.get('/:id/messages',       getMessages);
router.post('/:id/messages',      sendMessage);
export default router;
