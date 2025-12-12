const userController = require("../controllers/userController");
const router = require("express").Router();
const verifyToken = require('../utils/middleware');

// Profile routes (current user)
router.get('/profile', verifyToken.checkLogin, userController.getProfile);
router.put('/profile', verifyToken.protect, userController.updateProfile);

// User management routes (admin)
router.post('/search', verifyToken.checkLogin, userController.getAllUser);
router.get("/searchByEmail", verifyToken.checkLogin, userController.searchUserByEmail);
router.post('/', verifyToken.checkLogin, userController.createUser);
router.put('/:id', verifyToken.checkLogin, userController.updateUser);
router.delete("/:id", verifyToken.checkLogin, userController.deleteUser);

router.put('/change-password', verifyToken.protect, userController.changePassword);


module.exports = router;