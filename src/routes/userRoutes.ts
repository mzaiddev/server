import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateProfile,
  updateUser,
  updateUserStatus,
  userCreateSchema,
  userListSchema,
  userStatusSchema,
  userUpdateSchema
} from "../controllers/userController";
import { authorize, protect } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

router.use(protect);
router.patch("/profile", validate(userUpdateSchema), updateProfile);
router.use(authorize("admin"));
router.route("/").get(validate(userListSchema), listUsers).post(validate(userCreateSchema), createUser);
router.route("/:id").get(getUser).put(validate(userUpdateSchema), updateUser).delete(deleteUser);
router.patch("/:id/status", validate(userStatusSchema), updateUserStatus);

export default router;
