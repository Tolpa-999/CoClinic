
import {Router} from 'express'
import { approveUser } from '../controllers/admin.js'
import verifyToken  from '../utils/verifyUser.js';
import verifyAdmin from '../middleware/adminMiddleware.js';

const router = Router()

router.patch('/approve/:userId', verifyToken, verifyAdmin, approveUser);


export default router

