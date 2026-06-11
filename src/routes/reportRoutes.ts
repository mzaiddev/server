import { Router } from "express";
import { dashboard, exportData, globalSearch, monthly, monthlyReportSchema } from "../controllers/reportController";
import { protect } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);
router.get("/dashboard", dashboard);
router.get("/monthly", validate(monthlyReportSchema), monthly);
router.get("/export", exportData);
router.get("/search", globalSearch);

export default router;
