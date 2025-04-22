import { Router } from "express";

import { signup,signin, google, signout, verifyEmail, resetPassword, validPasswordToken, forgetPassword } from "../controllers/auth.js";

const router = Router();
router.post("/signup", signup);
router.post("/verify", verifyEmail);
router.post("/signin", signin);
router.post("/sendresetpassword", forgetPassword);
router.get("/validtoken/:token", validPasswordToken);
router.post("/resetpassword/:token", resetPassword);

router.post("/google", google);
router.get('/signout', signout)


export default router;