const authController = require("../controllers/authController");
const middleware = require("../utils/middleware");
const router = require("express").Router();

// ===== PUBLIC ROUTES =====
router.post("/register", authController.registerUser);
router.post("/login", authController.login);
router.post("/google-login", authController.googleLogin);
router.post("/logout", authController.logout);

// ===== PROTECTED ROUTES =====
router.get("/me", middleware.protect, authController.getMe);
router.get("/verify-token", middleware.protect, authController.verifyToken);

module.exports = router;