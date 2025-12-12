const orderController = require("../controllers/orderController");
const router = require("express").Router();
const middleware = require('../utils/middleware');


// Route reviews - KHÔNG CẦN middleware.checkLogin nếu muốn public

router.get("/reviews/:productId", orderController.getReviewsByProductId);

// Routes tìm kiếm
router.post('/search', orderController.getAllOrder);
router.get("/searchByName", middleware.checkLogin, orderController.searchOrderByName);

// Route lấy đơn hàng của user
router.get("/user", middleware.checkLogin, orderController.getOrderByUser);

// Route shipping cụ thể
router.get('/shipping/:id', orderController.getOrderDetailForShipping);

// Đánh giá sản phẩm trong đơn
router.post('/:orderId/rate-products', middleware.checkLogin, orderController.rateProductsInOrder);

// Đánh giá đơn hàng
router.post('/:id/rate', middleware.checkLogin, orderController.rateOrder);

// Tạo đơn hàng mới
router.post('/', orderController.createOrder);

// Cập nhật đơn hàng
router.put('/:id', middleware.checkLogin, orderController.updateOrder);

// Xóa đơn hàng
router.delete("/:id", middleware.checkLogin, orderController.deleteOrder);

router.get('/:id', middleware.checkLogin, middleware.getOrder, orderController.getOrderById);

module.exports = router;