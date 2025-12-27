const userController = require("../controllers/userController");
const router = require("express").Router();
const verifyToken = require('../utils/middleware');

console.log('✅ USER ROUTER FILE LOADED!');

// Profile routes (current user)
router.get('/profile', verifyToken.checkLogin, userController.getProfile);
router.put('/profile', verifyToken.protect, userController.updateProfile);

router.put('/change-password', verifyToken.checkLogin, userController.changePassword);

// Reset password route - ĐẶT TRƯỚC /:id
router.put('/reset-password/:id', verifyToken.checkLogin, userController.resetPassword);

// User management routes (admin)
router.post('/search', verifyToken.checkLogin, userController.getAllUser);
router.get("/searchByEmail", verifyToken.checkLogin, userController.searchUserByEmail);
router.post('/', verifyToken.checkLogin, userController.createUser);
router.delete("/:id", verifyToken.checkLogin, userController.deleteUser);

// Route này phải đặt CUỐI CÙNG
router.put('/:id', verifyToken.checkLogin, userController.updateUser);

console.log('✅ USER ROUTER ROUTES REGISTERED!');

module.exports = router;