const productController = require("../controllers/productController");
const router = require("express").Router();
const verifyToken = require('../utils/middleware');
const middleware = require('../utils/middleware');
const multer = require('multer');
const ReviewModel = require('../models/review');

const upload = multer({ dest: 'uploads/' });

// ===== SEARCH & FILTER ROUTES (ĐẶT TRƯỚC) =====
router.post('/search', productController.getAllProduct);
router.get("/searchByName", productController.searchCateByName);
router.post("/searchByPrice", productController.getSearchPrice);
router.post("/searchByPriceAndCategory", productController.getSearchPriceAndCategory);

// ===== CATEGORY ROUTES =====
router.get("/category/:categoryId", productController.getProductByCategory);

// ===== RECOMMEND ROUTE =====
router.get('/recommend/:id', productController.recommendProducts);

router.get('/:id/editability', productController.checkProductEditability);

// ===== VARIANT ROUTES (ĐẶT TRƯỚC /:id) =====
router.post('/check-variant-stock', productController.checkVariantStock);
router.post('/update-variant-stock', verifyToken.checkLogin, productController.updateVariantStock);
router.get('/:id/available-variants', productController.getAvailableVariants);
router.get('/:id/all-variants', productController.getAllVariants);

// ✅ ✅ ✅ THÊM ROUTE GET REVIEWS (KHÔNG CẦN TOKEN) ✅ ✅ ✅
router.get('/:id/reviews', async (req, res) => {
    try {
        const productId = req.params.id;
        console.log('🔍 [PRODUCT ROUTES] Getting reviews for product:', productId);
        
        const reviews = await ReviewModel.find({ product: productId })
            .populate('user', 'username email')
            .select('comment rating createdAt user')
            .sort({ createdAt: -1 });
        
        const reviewCount = reviews.length;
        let avgRating = 0;

        if (reviewCount > 0) {
            const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
            avgRating = totalRating / reviewCount;
        }

        // Tính thống kê đánh giá
        const reviewStats = {};
        for (const review of reviews) {
            if (reviewStats[review.rating]) {
                reviewStats[review.rating]++;
            } else {
                reviewStats[review.rating] = 1;
            }
        }

        const reviewStatsArray = Array.from({ length: 5 }, (_, i) => {
            const rating = i + 1;
            return reviewStats[rating] || 0;
        });

        console.log('✅ [PRODUCT ROUTES] Found reviews:', reviewCount);
        
        res.json({
            success: true,
            count: reviewCount,
            avgRating: avgRating,
            reviewStats: reviewStatsArray,
            data: reviews
        });
        
    } catch (error) {
        console.error('❌ [PRODUCT ROUTES] Error getting reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy reviews',
            error: error.message
        });
    }
});

// ✅ POST review (CẦN TOKEN)
router.post('/:id/reviews', verifyToken.checkLogin, productController.createReviews);

// ===== PRODUCT CRUD ROUTES (ĐẶT SAU CÙNG) =====
router.post('/', verifyToken.checkLogin, upload.single('image'), productController.createProduct);
router.put('/:id', verifyToken.checkLogin, productController.updateProduct);
router.delete("/:id", verifyToken.checkLogin, productController.deleteProduct);

// ⚠️ QUAN TRỌNG: Route /:id PHẢI ĐẶT CUỐI CÙNG ⚠️
router.get('/:id', middleware.getProduct, productController.getProductById);

router.get('/', productController.getAllProductsForChatBot);
module.exports = router;