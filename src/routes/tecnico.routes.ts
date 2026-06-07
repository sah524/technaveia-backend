import { Router } from 'express';
import { searchTechnicians, getTechnician, getTechnicianReviews, updateMyProfile } from '../controllers/tecnico.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
const router = Router();
router.get('/',            searchTechnicians);
router.get('/:id',         getTechnician);
router.get('/:id/reviews', getTechnicianReviews);
router.put('/me',          authMiddleware, updateMyProfile);
export default router;
