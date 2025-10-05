const orderController = require("../controllers/orderController");
const router = require("express").Router();
const middleware = require('../utils/middleware');

// Route tìm kiếm và lấy danh sách
router.post('/search', orderController.getAllOrder);
router.get("/searchByName", middleware.checkLogin, orderController.searchOrderByName);
router.get("/user", middleware.checkLogin, orderController.getOrderByUser);

// Routes có prefix cụ thể TRƯỚC route với tham số động
router.get('/shipping/:id', orderController.getOrderDetailForShipping);
router.post('/:orderId/rate-products', middleware.checkLogin, orderController.rateProductsInOrder);
router.get("/reviews/:productId", middleware.checkLogin, orderController.getReviewsByProductId);

// Route đánh giá đơn hàng
router.post('/:id/rate', middleware.checkLogin, orderController.rateOrder);

// Các route với tham số động đặt SAU cùng
router.get('/:id', middleware.checkLogin, middleware.getOrder, orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id', middleware.checkLogin, orderController.updateOrder);
router.delete("/:id", middleware.checkLogin, orderController.deleteOrder);

module.exports = router;