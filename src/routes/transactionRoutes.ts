import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  transactionCreateSchema,
  transactionListSchema,
  transactionUpdateSchema,
  updateTransaction
} from "../controllers/transactionController";
import { authorize, protect } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);
router.route("/").get(validate(transactionListSchema), listTransactions).post(validate(transactionCreateSchema), createTransaction);
router.get("/:id", getTransaction);
router.put("/:id", authorize("admin"), validate(transactionUpdateSchema), updateTransaction);
router.delete("/:id", authorize("admin"), deleteTransaction);

export default router;
