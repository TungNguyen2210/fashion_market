const express = require('express');
const promotionController = require('../controllers/promotionController');

const router = express.Router();


router.patch('/:id/increment-usage', promotionController.incrementUsage);

// 🔥 Lấy nhiều promotions cùng lúc (cho email)
router.post('/batch', promotionController.getBatchPromotions);

router.get('/products/active', promotionController.getActiveProductPromotions);

// Validate voucher code
router.post('/voucher/validate', promotionController.validateVoucher);

// Tính discount amount cho voucher
router.post('/voucher/calculate-discount', promotionController.calculateVoucherDiscount);

// Check free shipping promotion
router.post('/free-shipping/check', promotionController.checkFreeShipping);

// Lấy promotion theo loại
router.get('/by-type/:type', promotionController.getPromotionsByType);

// Check promotion availability
router.get('/:id/availability', promotionController.checkPromotionAvailability);

// ===== EXISTING ROUTES =====

// Tìm kiếm promotions
router.get('/search', promotionController.searchPromotions);

// Lấy promotions đang active
router.get('/active', promotionController.getActivePromotions);

// Lấy tất cả promotions (có filter)
router.get('/', promotionController.getAllPromotions);

// Lấy promotion theo ID
router.get('/:id', promotionController.getPromotionById);

// Tạo promotion mới
router.post('/', promotionController.createPromotion);

// Cập nhật promotion
router.put('/:id', promotionController.updatePromotion);

// Xóa promotion
router.delete('/:id', promotionController.deletePromotion);

// Áp dụng promotion cho sản phẩm cụ thể
router.post('/:promotionId/products/:productId', promotionController.applyPromotionToProduct);

module.exports = router;