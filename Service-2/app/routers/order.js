const orderController = require("../controllers/orderController");
const router = require("express").Router();
const middleware = require('../utils/middleware');

router.post('/search', orderController.getAllOrder);
router.get("/searchByName", middleware.checkLogin, orderController.searchOrderByName);
router.get("/user", middleware.checkLogin, orderController.getOrderByUser);

router.get('/:id', middleware.checkLogin, middleware.getOrder, orderController.getOrderById);
router.post('/', orderController.createOrder)
router.put('/:id', middleware.checkLogin, orderController.updateOrder)
router.delete("/:id", middleware.checkLogin, orderController.deleteOrder);
//Thêm phần đánh giá sản phẩm
router.post("/:id/rating", middleware.checkLogin, orderController.rateOrder);
router.get("/reviews/:productId",middleware.checkLogin, orderController.getReviewsByProductId);

module.exports = router;