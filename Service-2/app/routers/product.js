const productController = require("../controllers/productController");
const router = require("express").Router();
const verifyToken = require('../utils/middleware');
const middleware = require('../utils/middleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Các routes hiện có
router.post('/search', productController.getAllProduct);
router.get("/searchByName", productController.searchCateByName);
router.post("/searchByPrice", productController.getSearchPrice);
router.post('/', verifyToken.checkLogin, upload.single('image'), productController.createProduct)
router.put('/:id', verifyToken.checkLogin, productController.updateProduct)
router.delete("/:id", verifyToken.checkLogin, productController.deleteProduct);
router.get('/:id', middleware.getProduct, productController.getProductById);
router.post('/:id/reviews', verifyToken.checkLogin, productController.createReviews);
router.get('/recommend/:id', productController.recommendProducts);

// Thêm các routes mới cho quản lý biến thể
router.post('/check-variant-stock', productController.checkVariantStock);
router.post('/update-variant-stock', verifyToken.checkLogin, productController.updateVariantStock);
router.get('/:id/available-variants', productController.getAvailableVariants);
router.get('/:id/all-variants', productController.getAllVariants);

// Thêm route mới để tìm kiếm theo giá và danh mục
router.post("/searchByPriceAndCategory", productController.getSearchPriceAndCategory);

// Thêm route lấy sản phẩm theo danh mục
router.get("/category/:categoryId", productController.getProductByCategory);

module.exports = router;