import { Router } from "express";
import * as AuthController from "../controllers/authController";
import { body } from "express-validator";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post(
  "/register",
  [body("name").isString(), body("email").isEmail(), body("password").isLength({ min: 6 })],
  validate,
  AuthController.register
);

router.post("/login", [body("email").isEmail(), body("password").exists()], validate, AuthController.login);
router.post("/logout", authenticate, AuthController.logout);
router.post("/refresh-token", AuthController.refreshToken);
router.get("/profile", authenticate, AuthController.profile);
router.put("/update-profile", authenticate, AuthController.updateProfile);
router.put(
  "/change-password",
  [body("currentPassword").exists(), body("newPassword").isLength({ min: 6 })],
  validate,
  authenticate,
  AuthController.changePassword
);

export default router;
