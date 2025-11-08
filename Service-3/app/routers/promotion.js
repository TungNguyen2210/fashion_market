const express = require('express');
const promotionController = require('../controllers/promotionController');

const router = express.Router();

// ===== PATCH/POST ROUTES TRƯỚC =====
router.patch('/:id/use', promotionController.incrementUsage);
router.patch('/:id/increment-usage', promotionController.incrementUsage);
router.post('/batch', promotionController.getBatchPromotions);
router.post('/voucher/validate', promotionController.validateVoucher);
router.post('/voucher/calculate-discount', promotionController.calculateVoucherDiscount);
router.post('/free-shipping/check', promotionController.checkFreeShipping);
router.post('/', promotionController.createPromotion);
router.post('/:promotionId/products/:productId', promotionController.applyPromotionToProduct);

// ===== GET ROUTES - THỨ TỰ QUAN TRỌNG! =====
// Routes CỤ THỂ phải đặt TRƯỚC routes TỔNG QUÁT

router.get('/search', (req, res, next) => {
    console.log('🟢 SEARCH ROUTE HIT!', req.query);
    next();
}, promotionController.searchPromotions);

router.get('/active', (req, res, next) => {
    console.log('🔵 ACTIVE ROUTE HIT!', req.query);
    next();
}, promotionController.getActivePromotions);

router.get('/products/active', promotionController.getActiveProductPromotions);
router.get('/by-type/:type', promotionController.getPromotionsByType);
router.get('/:id/availability', promotionController.checkPromotionAvailability);

// ===== ROUTES TỔNG QUÁT PHẢI ĐẶT CUỐI =====
router.get('/:id', (req, res, next) => {
    console.log('🟡 ID ROUTE HIT!', req.params);
    next();
}, promotionController.getPromotionById);

router.get('/', (req, res, next) => {
    console.log('🔴 ROOT ROUTE HIT!', req.query);
    next();
}, promotionController.getAllPromotions);

// ===== PUT/DELETE ROUTES =====
router.put('/:id', promotionController.updatePromotion);
router.delete('/:id', promotionController.deletePromotion);

module.exports = router;