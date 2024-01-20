const productController = require("../controllers/productController");
const router = require("express").Router();
const verifyToken = require('../utils/middleware');
const middleware = require('../utils/middleware');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/search', productController.getAllProduct);
router.get("/searchByName", productController.searchCateByName);
router.post("/searchByPrice", productController.getSearchPrice);

router.post('/', verifyToken.checkLogin, upload.single('image'), productController.createProduct)
router.put('/:id', verifyToken.checkLogin, productController.updateProduct)
router.delete("/:id", verifyToken.checkLogin, productController.deleteProduct);
router.get('/:id', middleware.getProduct, productController.getProductById);
router.post('/:id/reviews', verifyToken.checkLogin, productController.createReviews);
router.get('/recommend/:id', verifyToken.checkLogin, productController.recommendProducts);

module.exports = router;