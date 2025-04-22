import {Router} from 'express'
import { approveUser, deleteUser, getUser, getUsers, searchUser, test, updateUser, userDetails } from '../controllers/user.js'
import upload from "../config/multer.js";
import verifyToken  from '../utils/verifyUser.js';
import verifyAdmin from '../middleware/adminMiddleware.js';

const router = Router()

router.get("/test",test)
router.post('/update/:id',verifyToken, upload.single('profileImage'), updateUser); 
router.delete('/delete/:id', verifyToken, deleteUser)
router.get('/getusers', verifyToken, getUsers);
router.post("/search-user",searchUser)
router.get("/user-details", userDetails)
router.get('/:userId', getUser)
router.patch('/approve/:userId', verifyToken, verifyAdmin, approveUser);
export default router