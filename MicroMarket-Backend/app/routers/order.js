const orderController = require("../controllers/orderController");
const router = require("express").Router();
const middleware = require('../utils/middleware');

router.post('/search', middleware.checkLogin, orderController.getAllOrder);
router.get("/searchByName", middleware.checkLogin, orderController.searchOrderByName);
router.get("/user", middleware.checkLogin, orderController.getOrderByUser);

router.get('/:id', middleware.checkLogin, middleware.getOrder, orderController.getOrderById);
router.post('/', middleware.checkLogin, orderController.createOrder)
router.put('/:id', middleware.checkLogin, orderController.updateOrder)
router.delete("/:id", middleware.checkLogin, orderController.deleteOrder);

module.exports = router;