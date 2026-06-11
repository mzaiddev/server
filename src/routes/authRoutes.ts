import { Router } from "express";
import { login, loginSchema, me } from "../controllers/authController";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.get("/me", protect, me);

export default router;
