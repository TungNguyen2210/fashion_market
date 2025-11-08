const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');

// 🧪 Test & Info routes
router.get('/test', shippingController.testConnection);
router.get('/weight-info', shippingController.getWeightInfo);

// 💰 Shipping calculation routes
router.post('/calculate-fee', shippingController.calculateFee);
router.post('/calculate-order-shipping', shippingController.calculateOrderShipping);

// 🌍 Address lookup routes
router.get('/provinces', shippingController.getProvinces);
router.get('/districts/:provinceId', shippingController.getDistricts);
router.get('/wards/:districtId', shippingController.getWards);

// ⚙️ Management routes (for future admin panel)
router.post('/category-weight', shippingController.updateCategoryWeight);

module.exports = router;